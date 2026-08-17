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

// Актуальные официальные модели Gemini API
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Рекомендуемая', tier: 'medium' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', tag: 'Ультра-быстрая', tier: 'light' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tag: 'Новинка', tier: 'heavy' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tier: 'medium' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', tag: 'Максимальный ум', tier: 'heavy' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'medium' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tag: 'Легкая', tier: 'light' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'heavy' }
];

const STORAGE_KEY = 'craig_selected_model';
const ENERGY_KEY = 'craig_energy_data';

export class CraigApiError extends Error {
  code: string | number;
  constructor(message: string, code: string | number = '500') {
    super(message);
    this.code = code;
  }
}

export function getSelectedModelId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'gemini-3.6-flash';
}

export function setSelectedModelId(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

// ==========================================
// ЛОГИКА ЭНЕРГИИ / ЛИМИТОВ
// ==========================================
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
    // Автосброс раз в сутки (новый день = 100%)
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
  
  // Расход: тяжелые ~16%, средние ~10%, легкие ~5%
  let cost = 10;
  if (model.tier === 'heavy') cost = 16;
  if (model.tier === 'light') cost = 5;

  const current = getEnergyPercent();
  const next = Math.max(0, current - cost);
  const today = new Date().toDateString();
  localStorage.setItem(ENERGY_KEY, JSON.stringify({ percent: next, lastResetDay: today }));
}

function getApiKeys(): string[] {
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
  if (env.VITE_GEMINI_API_KEY_4) {
    env.VITE_GEMINI_API_KEY_4.split(',').forEach(k => keys.push(k.trim()));
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
    console.warn('[Craig] Загружен резервный системный промпт');
  }
  return `Ты — Крегг, ИИ-Акинатор. Твоя цель — угадать загаданного персонажа бинарным поиском. Отвечай ТОЛЬКО строгим JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
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

// Запрос с таймаутом против зависания
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const keys = getApiKeys();
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
        console.log(`[Craig AI] Запрос к ${model} (Ключ #${keyIndex + 1})...`);
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

        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, 8000);

        if (!response.ok) {
          lastStatusCode = response.status;
          lastErrorDetails = await response.text();

          if (response.status === 429 || response.status === 403) {
            console.warn(`[Craig AI] Ключ #${keyIndex + 1} исчерпал квоту на ${model} (${response.status}). Переключаемся на следующий ключ...`);
            break;
          }

          console.warn(`[Craig AI] ${model} вернул ${response.status}. Пробуем следующую...`);
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) continue;

        const parsed = extractValidJSON(rawText);
        currentActiveKeyIndex = keyIndex;
        console.log(`✅ [Craig AI] Ответ от ${model}:`, parsed);
        return parsed;

      } catch (err: any) {
        lastErrorDetails = err.name === 'AbortError' ? `Таймаут модели ${model}` : (err.message || String(err));
        console.warn(`[Craig AI] Ошибка (${model}, Ключ #${keyIndex + 1}):`, lastErrorDetails);
      }
    }
  }

  throw new CraigApiError(lastErrorDetails || 'Все доступные ключи и модели временно исчерпали квоту', lastStatusCode);
}
