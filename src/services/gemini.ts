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

// Список моделей в порядке приоритета: пробуем новейшие, затем стабильные
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

let workingModelCache: string | null = null;
let systemPromptCache = '';

// Получение API-ключа
function getApiKey(): string {
  const key = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY || '';
  if (!key) {
    console.error('⚠️ [Craig] ВНИМАНИЕ: Переменная VITE_GEMINI_API_KEY пуста или не задана в Vercel!');
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
    console.warn('[Craig] Не удалось загрузить Prompt.txt, используется базовый');
  }
  return `Ты — Крегг, ИИ-Акинатор. Угадывай персонажей. Отвечай только строгим JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
}

// Функция извлечения JSON из любого сырого ответа ИИ
function extractValidJSON(raw: string): AIResponse {
  try {
    // 1. Попытка распарсить как есть
    return JSON.parse(raw);
  } catch {
    // 2. Поиск первой JSON-структуры {...}
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Не удалось извлечь JSON из ответа: ${raw}`);
  }
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const apiKey = getApiKey();
  const systemPrompt = await getSystemPrompt();

  // Если мы уже нашли рабочую модель — используем её в первую очередь
  const modelsToTry = workingModelCache 
    ? [workingModelCache, ...CANDIDATE_MODELS.filter(m => m !== workingModelCache)]
    : CANDIDATE_MODELS;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Craig] Отправка запроса к модели: ${model}`);
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
        console.warn(`[Craig] Модель ${model} вернула статус ${response.status}: ${errText}`);
        continue; // Пробуем следующую модель
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        continue;
      }

      const parsed = extractValidJSON(rawText);
      
      // Запоминаем рабочую модель
      workingModelCache = model;
      console.log(`✅ [Craig] Успешный ответ от ${model}:`, parsed);
      return parsed;

    } catch (err: any) {
      console.warn(`[Craig] Ошибка с моделью ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Ни одна из моделей Gemini не смогла ответить');
}
