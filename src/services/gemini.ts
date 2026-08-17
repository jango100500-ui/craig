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
}

// Класс ошибки с сохранением HTTP кода (429, 500, 404 и т.д.)
export class CraigApiError extends Error {
  code: string | number;
  constructor(message: string, code: string | number = '500') {
    super(message);
    this.code = code;
  }
}

// Полный пул моделей семейства 3.x и 2.5
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Рекомендуемая' },
  { id: 'gemini-3.6-flash-lite', name: 'Gemini 3.6 Flash Lite', tag: 'Ультра-быстрая' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tag: 'Новинка' },
  { id: 'gemini-3.7-flash-lite', name: 'Gemini 3.7 Flash Lite' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', tag: 'Максимальный ум' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
];

const STORAGE_KEY = 'craig_selected_model';

export function getSelectedModelId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'gemini-3.6-flash';
}

export function setSelectedModelId(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

// Автосбор всех ключей: 1, 2, 3 и т.д.
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
  if (env.VITE_GEMINI_API_KEY_4) {
    env.VITE_GEMINI_API_KEY_4.split(',').forEach(k => keys.push(k.trim()));
  }
  if (env.VITE_GEMINI_BACKUP_KEY) {
    env.VITE_GEMINI_BACKUP_KEY.split(',').forEach(k => keys.push(k.trim()));
  }

  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));

  if (uniqueKeys.length === 0) {
    throw new CraigApiError('API-ключи не найдены в переменных окружения Vercel', 'NO_KEYS');
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
    console.warn('[Craig] Загружен базовый промпт');
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

  // Перебираем Ключ 1 -> Ключ 2 -> Ключ 3
  for (let k = 0; k < keys.length; k++) {
    const keyIndex = (currentActiveKeyIndex + k) % keys.length;
    const currentApiKey = keys[keyIndex];

    for (const model of allModels) {
      try {
        console.log(`[Craig AI] Запрос к ${model} (Ключ #${keyIndex + 1} из ${keys.length})...`);
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

          // При ошибке 429 или 403 сразу переключаемся на СЛЕДУЮЩИЙ КЛЮЧ
          if (response.status === 429 || response.status === 403) {
            console.warn(`⚠️ [Craig AI] Ключ #${keyIndex + 1} вернул ${response.status}. Переключаемся на следующий ключ...`);
            break; 
          }

          console.warn(`[Craig AI] Модель ${model} вернула ${response.status}. Пробуем резервную модель...`);
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) continue;

        const parsed = extractValidJSON(rawText);

        // Успех: фиксируем рабочий ключ
        currentActiveKeyIndex = keyIndex;
        console.log(`✅ [Craig AI] Успех от ${model} (Ключ #${keyIndex + 1}):`, parsed);
        return parsed;

      } catch (err: any) {
        lastErrorDetails = err.message || String(err);
        console.warn(`[Craig AI] Ошибка запроса (${model}, Ключ #${keyIndex + 1}):`, lastErrorDetails);
      }
    }
  }

  // Только если ВСЕ 3 ключа на всех моделях выдали ошибку:
  throw new CraigApiError(lastErrorDetails || 'Все ключи и модели исчерпали квоту', lastStatusCode);
}
