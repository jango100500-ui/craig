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

// Автоматический сбор всех ключей: VITE_GEMINI_API_KEY, VITE_GEMINI_API_KEY_2 и др.
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

  if (env.VITE_GEMINI_BACKUP_KEY) {
    env.VITE_GEMINI_BACKUP_KEY.split(',').forEach(k => keys.push(k.trim()));
  }

  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));

  if (uniqueKeys.length === 0) {
    throw new Error('API-ключи не найдены! Добавьте VITE_GEMINI_API_KEY или VITE_GEMINI_API_KEY_2 в Vercel');
  }

  return uniqueKeys;
}

// Запоминаем текущий рабочий ключ, чтобы не повторять исчерпанный
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

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const keys = getAllApiKeys();
  const systemPrompt = await getSystemPrompt();

  const userChosen = getSelectedModelId();
  const allModels = [
    userChosen,
    ...AVAILABLE_MODELS.map(m => m.id).filter(id => id !== userChosen)
  ];

  let lastErrorMsg = '';

  // Проходим по всем доступным ключам, начиная с последнего успешно сработавшего
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
          const errDetails = await response.text();
          lastErrorMsg = `HTTP ${response.status}: ${errDetails}`;

          // При ошибке 429 мгновенно бросаем этот ключ и переходим к следующему ключу!
          if (response.status === 429) {
            console.warn(`⚠️ [Craig AI] Ключ #${keyIndex + 1} исчерпал лимит (429). Мгновенное переключение на следующий ключ...`);
            break; // Выходим из цикла моделей для этого ключа и берем следующий ключ
          }

          console.warn(`[Craig AI] Модель ${model} вернула ${response.status}. Пробуем резервную модель...`);
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) continue;

        const parsed = extractValidJSON(rawText);

        // Успех: сохраняем этот ключ как основной для следующих вопросов партии
        currentActiveKeyIndex = keyIndex;
        console.log(`✅ [Craig AI] Успешный ответ от ${model} (через Ключ #${keyIndex + 1}):`, parsed);
        return parsed;

      } catch (err: any) {
        lastErrorMsg = err.message || String(err);
        console.warn(`[Craig AI] Ошибка запроса (${model}, Ключ #${keyIndex + 1}):`, lastErrorMsg);
      }
    }
  }

  throw new Error(lastErrorMsg || 'Все доступные ключи и модели временно исчерпали квоту.');
}
