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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash';

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
    console.warn('Не удалось загрузить Prompt.txt, используется встроенный');
  }
  return `Ты — Крегг, ИИ-Акинатор. Угадывай персонажей. Отвечай только валидным JSON: {"reflection":"...", "qunumber":1, "answer":"...", "character": null}`;
}

export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const systemPrompt = await getSystemPrompt();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

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
    const errorData = await response.text();
    throw new Error(`Ошибка Gemini API: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Пустой ответ от Gemini');
  }

  // Очистка от возможных markdown-тегов
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson) as AIResponse;
}
