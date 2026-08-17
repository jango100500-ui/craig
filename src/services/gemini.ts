export interface AIResponse {
  reflection: string;
  qunumber: number;
  answer: string;
  character: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export interface ModelOption {
  id: string;
  name: string;
  tag?: string;
  tier: 'heavy' | 'medium' | 'light';
}

export class CraigApiError extends Error {
  code: string | number;
  constructor(message: string, code: string | number = '500') {
    super(message);
    this.code = code;
  }
}

// Актуальные модели Gemini
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Рекомендуемая', tier: 'medium' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Быстрая', tier: 'medium' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tag: 'Новинка', tier: 'heavy' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tag: 'Легкая', tier: 'light' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', tag: 'Максимальный ум', tier: 'heavy' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'heavy' }
];

const STORAGE_KEY = 'craig_selected_model';
const ENERGY_KEY = 'craig_energy_data';

export function getSelectedModelId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'gemini-2.5-flash';
}

export function setSelectedModelId(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

// Расчет шкалы лимитов на день
interface EnergyData {
  percent: number;
  lastResetDay: string;
}

export function getEnergyPercent(): number {
  const today = new Date().toDateString();
  try {
    const raw = localStorage.getItem(ENERGY_KEY);
    if (!raw) {
      const initial: EnergyData = { percent: 100, lastResetDay: today };
      localStorage.setItem(ENERGY_KEY, JSON.stringify(initial));
      return 100;
    }
    const data: EnergyData = JSON.parse(raw);
    if (data.lastResetDay !== today) {
      const resetData: EnergyData = { percent: 100, lastResetDay: today };
      localStorage.setItem(ENERGY_KEY, JSON.stringify(resetData));
      return 100;
    }
    return Math.max(0, Math.min(100, data.percent));
  } catch {
    return 100;
  }
}

export function deductEnergyForGame(): void {
  const currentModelId = getSelectedModelId();
  const model = AVAILABLE_MODELS.find(m => m.id === currentModelId) || AVAILABLE_MODELS[0];
  
  let cost = 10;
  if (model.tier === 'heavy') cost = 15;
  if (model.tier === 'light') cost = 5;

  const current = getEnergyPercent();
  const next = Math.max(0, current - cost);
  const today = new Date().toDateString();
  localStorage.setItem(ENERGY_KEY, JSON.stringify({ percent: next, lastResetDay: today }));
}

function getAllApiKeys(): string[] {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const keys: string[] = [];

  if (env.VITE_GEMINI_API_KEY) {
    env.VITE_GEMINI_API_KEY.split(',').forEach(k => keys.push(k.trim()));
  }
  if (env.VITE_GEMINI_API_KEY_2) {
    env.VITE_GEMINI_API_KEY_2.split(',').forEach(k => keys.push(k.trim()));
  }
  if (env.VITE_GEMINI_API_KEY_3) {
    env.VITE_GEMINI_API_KEY_3.split(',').forEach(k => keys.push(k.trim()));
  }

  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  if (uniqueKeys.length === 0) {
    throw new CraigApiError('API-ключи не найдены в переменных Vercel', 'NO_KEYS');
  }
  return uniqueKeys;
}

let currentActiveKeyIndex = 0;
let systemPromptCache = '';

async function getSystemPrompt(): Promise<string> {
  if (systemPromptCache) return systemPromptCache;
  try {
    const res = await fetch(`/Prompt.txt?t=${Date.now()}`);
    if (res.ok) {
      systemPromptCache = await res.text();
      return systemPromptCache;
    }
  } catch (e) {
    console.warn('[Craig] Базовый системный промпт');
  }
  return `Ты — Крегг, ИИ-Акинатор. Угадывай персонажей бинарным поиском. Отвечай ТОЛЬКО строгим JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
}

function extractValidJSON(raw: string): AIResponse {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Ответ не содержит валидного JSON: ${raw}`);
  }
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const keys = getAllApiKeys();
  const systemPrompt = await getSystemPrompt();

  const userChosen = getSelectedModelId();
  const allModels = [
    userChosen,
    ...AVAILABLE_MODELS.map(m => m.id).filter(id => id !== userChosen)
  ];

  let lastStatusCode: string | number = '500';
  let lastErrorDetails = '';

  for (let k = 0; k < keys.length; k++) {
    const keyIndex = (currentActiveKeyIndex + k) % keys.length;
    const currentApiKey = keys[keyIndex];

    for (const model of allModels) {
      try {
        console.log(`[Craig AI] Отправка запроса к ${model} (Ключ #${keyIndex + 1})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentApiKey}`;

        const payload = {
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: history,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          lastStatusCode = response.status;
          lastErrorDetails = await response.text();

          // При лимите 429 переключаемся на следующий ключ
          if (response.status === 429 || response.status === 403) {
            console.warn(`[Craig AI] Ключ #${keyIndex + 1} исчерпал лимит (${response.status}). Переключаемся на следующий ключ...`);
            break;
          }

          console.warn(`[Craig AI] ${model} вернул ${response.status}. Пробуем следующую модель...`);
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) continue;

        const parsed = extractValidJSON(rawText);
        currentActiveKeyIndex = keyIndex;
        console.log(`✅ [Craig AI] Успешный ответ от ${model}:`, parsed);
        return parsed;

      } catch (err: any) {
        lastErrorDetails = err.message || String(err);
        console.warn(`[Craig AI] Ошибка запроса:`, lastErrorDetails);
      }
    }
  }

  throw new CraigApiError(lastErrorDetails || 'Все ключи и модели исчерпали квоту', lastStatusCode);
}
