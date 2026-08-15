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

// 100% стабильные модели Google API
const MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash'];

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
    console.warn('Не удалось загрузить Prompt.txt');
  }
  return `Ты — Крегг, ИИ-Акинатор. Угадывай персонажей на русском языке. Отвечай ТОЛЬКО строгим JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const apiKey = getApiKey();
  const systemPrompt = await getSystemPrompt();

  let lastErrorMsg = '';

  for (const model of MODELS) {
    try {
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
        const errText = await response.text();
        lastErrorMsg = `HTTP ${response.status}: ${errText}`;
        console.error(`Ошибка Gemini (${model}):`, lastErrorMsg);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Модель вернула пустой ответ');
      }

      // Извлекаем чистый JSON
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Ответ модели не содержит JSON: ${rawText}`);
      }

      return JSON.parse(jsonMatch[0]) as AIResponse;
    } catch (err: any) {
      lastErrorMsg = err.message || String(err);
      console.warn(`Попытка с ${model} не удалась:`, lastErrorMsg);
    }
  }

  throw new Error(lastErrorMsg || 'Не удалось связаться с Gemini API');
}
