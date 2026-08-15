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

// Официальные поддерживаемые модели Google Gemini API
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro'
];

let workingModelCache: string | null = null;
let systemPromptCache = '';

function getApiKey(): string {
  const key = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY || '';
  if (!key) {
    console.error('⚠️ [Craig] Ключ VITE_GEMINI_API_KEY не обнаружен!');
  }
  return key;
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
    console.warn('[Craig] Используется резервный системный промпт');
  }
  return `Ты — Крегг, ИИ-Акинатор. Угадывай персонажей. Отвечай только строгим JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
}

function extractValidJSON(raw: string): AIResponse {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Не удалось распарсить JSON: ${raw}`);
  }
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const apiKey = getApiKey();
  const systemPrompt = await getSystemPrompt();

  const modelsToTry = workingModelCache 
    ? [workingModelCache, ...CANDIDATE_MODELS.filter(m => m !== workingModelCache)]
    : CANDIDATE_MODELS;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        systemInstruction: {
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
        const errText = await response.text();
        console.warn(`[Craig] Ошибка модели ${model} (${response.status}):`, errText);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) continue;

      const parsed = extractValidJSON(rawText);
      workingModelCache = model;
      return parsed;

    } catch (err: any) {
      console.warn(`[Craig] Исключение с моделью ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Все модели Gemini недоступны');
}
