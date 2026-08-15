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

// 100% валидные рабочие модели Gemini REST API
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

let workingModelCache: string | null = null;
let systemPromptCache = '';

function getApiKey(): string {
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  if (!envKey || envKey.trim() === '') {
    console.error('⚠️ [Craig Error] VITE_GEMINI_API_KEY не найден в переменных окружения Vercel!');
    return '';
  }
  return envKey.trim();
}

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
    throw new Error(`Невалидный JSON: ${raw}`);
  }
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const systemPrompt = await getSystemPrompt();

  const modelsToTry = workingModelCache 
    ? [workingModelCache, ...CANDIDATE_MODELS.filter(m => m !== workingModelCache)]
    : CANDIDATE_MODELS;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: history,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errDetails = await response.text();
        console.warn(`[Craig] Ошибка вызова модели ${model} (${response.status}):`, errDetails);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) continue;

      const parsed = extractValidJSON(rawText);
      workingModelCache = model;
      console.log(`[Craig AI] Ответ получен от ${model}:`, parsed);
      return parsed;

    } catch (err: any) {
      console.warn(`[Craig AI] Исключение с моделью ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Все модели Gemini недоступны');
}
