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

// Проверенные активные модели Google Gemini API
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Рекомендуемая' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Быстрая' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tag: 'Легкая' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Умная' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }
];

const STORAGE_KEY = 'craig_selected_model';

export function getSelectedModelId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'gemini-2.5-flash';
}

export function setSelectedModelId(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

function getApiKeys(): string[] {
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  if (!envKey || envKey.trim() === '') {
    throw new Error('API-ключ VITE_GEMINI_API_KEY не найден в переменных Vercel / .env.local');
  }
  return envKey.split(',').map(k => k.trim()).filter(Boolean);
}

async function getSystemPrompt(): Promise<string> {
  try {
    const res = await fetch(`/Prompt.txt?t=${Date.now()}`);
    if (res.ok) {
      return await res.text();
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

// Запрос с жестким прерыванием по таймауту (не дает Креггу зависнуть)
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
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

  let lastErrorMsg = '';

  for (const apiKey of keys) {
    for (const model of allModels) {
      try {
        console.log(`[Craig AI] Отправка запроса к ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        }, 5000);

        if (!response.ok) {
          const errDetails = await response.text();
          console.warn(`[Craig AI] ${model} вернул статус ${response.status}. Пробуем следующую...`);
          lastErrorMsg = `HTTP ${response.status}: ${errDetails}`;
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) continue;

        const parsed = extractValidJSON(rawText);
        console.log(`✅ [Craig AI] Успешный ответ от ${model}:`, parsed);
        return parsed;

      } catch (err: any) {
        lastErrorMsg = err.name === 'AbortError' ? `Таймаут модели ${model}` : (err.message || String(err));
        console.warn(`[Craig AI] Ошибка модели ${model}:`, lastErrorMsg);
      }
    }
  }

  throw new Error(lastErrorMsg || 'Все доступные модели Gemini временно не отвечают. Попробуйте снова.');
}
