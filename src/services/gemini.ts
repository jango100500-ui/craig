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

// Только официально поддерживаемые и активные модели Google
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Рекомендуемая' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Максимальный ум' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tag: 'Ультра-быстрая' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Новое поколение' }
];

const STORAGE_KEY = 'craig_selected_model';

export function getSelectedModelId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'gemini-2.5-flash';
}

export function setSelectedModelId(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

function getApiKey(): string {
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  if (!envKey || envKey.trim() === '') {
    throw new Error('API-ключ VITE_GEMINI_API_KEY не найден в переменных Vercel / .env.local');
  }
  return envKey.trim();
}

async function getSystemPrompt(): Promise<string> {
  try {
    const res = await fetch(`/Prompt.txt?t=${Date.now()}`);
    if (res.ok) {
      return await res.text();
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
    throw new Error(`Ответ не содержит корректного JSON: ${raw}`);
  }
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const apiKey = getApiKey();
  const systemPrompt = await getSystemPrompt();

  const userChosen = getSelectedModelId();
  const modelsToTry = [
    userChosen,
    ...AVAILABLE_MODELS.map(m => m.id).filter(id => id !== userChosen)
  ];

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    try {
      console.log(`[Craig AI] Запрос к модели: ${model}`);
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

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errDetails = await response.text();
        lastErrorMsg = `HTTP ${response.status}: ${errDetails}`;
        console.warn(`[Craig AI] Модель ${model} недоступна (${response.status}), переключаемся...`);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) continue;

      const parsed = extractValidJSON(rawText);
      console.log(`✅ [Craig AI] Успешный ответ от ${model}:`, parsed);
      return parsed;

    } catch (err: any) {
      lastErrorMsg = err.message || String(err);
      console.warn(`[Craig AI] Ошибка модели ${model}:`, lastErrorMsg);
    }
  }

  throw new Error(lastErrorMsg || 'Все доступные модели Gemini временно недоступны');
}
