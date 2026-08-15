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

// Актуальные модели Google Gemini API в порядке приоритета
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

let workingModelCache: string | null = null;
let systemPromptCache = '';

function getApiKey(): string {
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  if (!envKey || envKey.trim() === '') {
    throw new Error('API-ключ VITE_GEMINI_API_KEY не найден в переменных Vercel / .env.local');
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
    console.warn('[Craig] Используется встроенный системный промпт');
  }
  return `Ты — Крегг, ИИ-Акинатор. Твоя цель — угадать загаданного персонажа бинарным поиском. Отвечай ТОЛЬКО валидным JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
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

  // Если уже нашли рабочую модель — пробуем её первой
  const modelsToTry = workingModelCache 
    ? [workingModelCache, ...CANDIDATE_MODELS.filter(m => m !== workingModelCache)]
    : CANDIDATE_MODELS;

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    try {
      console.log(`[Craig AI] Пробуем модель: ${model}...`);
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
        console.warn(`[Craig AI] Модель ${model} недоступна (${response.status}), переключаемся на следующую...`);
        continue; // Бесшовно пробуем следующую модель
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        console.warn(`[Craig AI] Пустой ответ от ${model}, пробуем следующую...`);
        continue;
      }

      const parsed = extractValidJSON(rawText);
      
      // Запоминаем рабочую модель для следующих вопросов
      workingModelCache = model;
      console.log(`✅ [Craig AI] Успешный ответ от модели ${model}:`, parsed);
      return parsed;

    } catch (err: any) {
      lastErrorMsg = err.message || String(err);
      console.warn(`[Craig AI] Ошибка с моделью ${model}:`, lastErrorMsg);
    }
  }

  throw new Error(lastErrorMsg || 'Все модели Gemini временно недоступны');
}
