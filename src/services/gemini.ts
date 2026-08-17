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

export type ProviderType = 'gemini' | 'deepseek' | 'openrouter';

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderType;
  tag?: string;
  tier: 'heavy' | 'medium' | 'light';
}

export class CraigApiError extends Error {
  code: string | number;
  constructor(message: string, code: string | number = '500') {
    super(message);
    this.code = code;
  }
}

// Полный арсенал моделей: DeepSeek, OpenRouter и все семейство Gemini
export const AVAILABLE_MODELS: ModelOption[] = [
  // 1. Официальный DeepSeek API
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', tag: 'Рассуждающая', tier: 'heavy' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', tag: 'Быстрая', tier: 'medium' },

  // 2. OpenRouter API (Умные и щедрые модели)
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)', provider: 'openrouter', tag: 'OpenRouter', tier: 'heavy' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', tag: 'Щедрая', tier: 'heavy' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'openrouter', tag: 'Умная', tier: 'heavy' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'openrouter', tag: 'Легкая', tier: 'light' },

  // 3. Полный пул Google Gemini
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'gemini', tag: 'Рекомендуемая', tier: 'medium' },
  { id: 'gemini-3.6-flash-lite', name: 'Gemini 3.6 Flash Lite', provider: 'gemini', tag: 'Ультра-быстрая', tier: 'light' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'gemini', tier: 'medium' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', provider: 'gemini', tier: 'light' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'gemini', tag: 'Новинка', tier: 'heavy' },
  { id: 'gemini-3.7-flash-lite', name: 'Gemini 3.7 Flash Lite', provider: 'gemini', tier: 'light' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', provider: 'gemini', tag: 'Макс. ум', tier: 'heavy' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', tier: 'medium' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'gemini', tier: 'light' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', tier: 'heavy' }
];

const STORAGE_KEY = 'craig_selected_model';
const ENERGY_KEY = 'craig_energy_data';

export function getSelectedModelId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'gemini-3.6-flash';
}

export function setSelectedModelId(modelId: string): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

// Расчет лимитов энергии
interface EnergyData {
  percent: number;
  lastResetDay: string;
}

export function getEnergyPercent(): number {
  const today = new Date().toDateString();
  try {
    const raw = localStorage.getItem(ENERGY_KEY);
    if (!raw) {
      const initial: EnergyData = { percent: 100, lastResetDay: today };
      localStorage.setItem(ENERGY_KEY, JSON.stringify(initial));
      return 100;
    }
    const data: EnergyData = JSON.parse(raw);
    if (data.lastResetDay !== today) {
      const resetData: EnergyData = { percent: 100, lastResetDay: today };
      localStorage.setItem(ENERGY_KEY, JSON.stringify(resetData));
      return 100;
    }
    return Math.max(0, Math.min(100, data.percent));
  } catch {
    return 100;
  }
}

export function deductEnergyForGame(): void {
  const currentModelId = getSelectedModelId();
  const model = AVAILABLE_MODELS.find(m => m.id === currentModelId) || AVAILABLE_MODELS[0];
  
  let cost = 10;
  if (model.tier === 'heavy') cost = 16;
  if (model.tier === 'light') cost = 5;

  const current = getEnergyPercent();
  const next = Math.max(0, current - cost);
  const today = new Date().toDateString();
  localStorage.setItem(ENERGY_KEY, JSON.stringify({ percent: next, lastResetDay: today }));
}

// Сбор ключей Gemini
function getGeminiKeys(): string[] {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const keys: string[] = [];
  if (env.VITE_GEMINI_API_KEY) env.VITE_GEMINI_API_KEY.split(',').forEach(k => keys.push(k.trim()));
  if (env.VITE_GEMINI_API_KEY_2) env.VITE_GEMINI_API_KEY_2.split(',').forEach(k => keys.push(k.trim()));
  if (env.VITE_GEMINI_API_KEY_3) env.VITE_GEMINI_API_KEY_3.split(',').forEach(k => keys.push(k.trim()));
  if (env.VITE_GEMINI_API_KEY_4) env.VITE_GEMINI_API_KEY_4.split(',').forEach(k => keys.push(k.trim()));
  if (env.VITE_GEMINI_BACKUP_KEY) env.VITE_GEMINI_BACKUP_KEY.split(',').forEach(k => keys.push(k.trim()));
  return Array.from(new Set(keys.filter(Boolean)));
}

// Сбор ключей DeepSeek
function getDeepSeekKeys(): string[] {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const keys: string[] = [];
  if (env.VITE_DEEPSEEK_API_KEY) env.VITE_DEEPSEEK_API_KEY.split(',').forEach(k => keys.push(k.trim()));
  if (env.VITE_DEEPSEEK_API_KEY_2) env.VITE_DEEPSEEK_API_KEY_2.split(',').forEach(k => keys.push(k.trim()));
  return Array.from(new Set(keys.filter(Boolean)));
}

// Сбор ключей OpenRouter
function getOpenRouterKeys(): string[] {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const keys: string[] = [];
  if (env.VITE_OPENROUTER_API_KEY) env.VITE_OPENROUTER_API_KEY.split(',').forEach(k => keys.push(k.trim()));
  if (env.VITE_OPENROUTER_API_KEY_2) env.VITE_OPENROUTER_API_KEY_2.split(',').forEach(k => keys.push(k.trim()));
  return Array.from(new Set(keys.filter(Boolean)));
}

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
    console.warn('[Craig] Загружен базовый системный промпт');
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

// -------------------------------------------------------------
// ВЫЗОВ GOOGLE GEMINI
// -------------------------------------------------------------
async function callGemini(modelId: string, apiKey: string, history: ChatMessage[], systemPrompt: string): Promise<AIResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
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
    throw new CraigApiError(`Gemini ${modelId} error: ${errDetails}`, response.status);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Пустой ответ от Gemini');
  return extractValidJSON(rawText);
}

// -------------------------------------------------------------
// ВЫЗОВ ОФИЦИАЛЬНОГО DEEPSEEK API
// -------------------------------------------------------------
async function callDeepSeek(modelId: string, apiKey: string, history: ChatMessage[], systemPrompt: string): Promise<AIResponse> {
  const url = 'https://api.deepseek.com/chat/completions';
  
  const openAiMessages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text
    }))
  ];

  const payload: Record<string, any> = {
    model: modelId,
    messages: openAiMessages,
    temperature: 0.7
  };

  if (modelId === 'deepseek-chat') {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errDetails = await response.text();
    throw new CraigApiError(`DeepSeek ${modelId} error: ${errDetails}`, response.status);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Пустой ответ от DeepSeek');
  return extractValidJSON(rawText);
}

// -------------------------------------------------------------
// ВЫЗОВ OPENROUTER API
// -------------------------------------------------------------
async function callOpenRouter(modelId: string, apiKey: string, history: ChatMessage[], systemPrompt: string): Promise<AIResponse> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const openAiMessages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text
    }))
  ];

  const payload = {
    model: modelId,
    messages: openAiMessages,
    temperature: 0.7
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://craig.vercel.app',
      'X-Title': 'Craig AI Akinator'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errDetails = await response.text();
    throw new CraigApiError(`OpenRouter ${modelId} error: ${errDetails}`, response.status);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Пустой ответ от OpenRouter');
  return extractValidJSON(rawText);
}

// -------------------------------------------------------------
// ГЛАВНЫЙ РОУТЕР И АВТО-ПЕРЕКЛЮЧЕНИЕ ПРОВАЙДЕРОВ
// -------------------------------------------------------------
export async function askCraig(history: ChatMessage[]): Promise<AIResponse> {
  const systemPrompt = await getSystemPrompt();

  const geminiKeys = getGeminiKeys();
  const deepseekKeys = getDeepSeekKeys();
  const openrouterKeys = getOpenRouterKeys();

  const userChosenId = getSelectedModelId();
  const chosenModel = AVAILABLE_MODELS.find(m => m.id === userChosenId) || AVAILABLE_MODELS[0];

  // Сначала пробуем выбранную модель, затем все остальные как резерв
  const prioritizedModels = [
    chosenModel,
    ...AVAILABLE_MODELS.filter(m => m.id !== chosenModel.id)
  ];

  let lastErrorDetails = '';
  let lastStatusCode: string | number = '500';

  for (const model of prioritizedModels) {
    if (model.provider === 'deepseek') {
      if (deepseekKeys.length === 0) continue;
      for (const key of deepseekKeys) {
        try {
          console.log(`[Craig AI] Запрос к DeepSeek (${model.id})...`);
          const res = await callDeepSeek(model.id, key, history, systemPrompt);
          console.log(`✅ [Craig AI] Успех от DeepSeek:`, res);
          return res;
        } catch (err: any) {
          lastStatusCode = err.code || '500';
          lastErrorDetails = err.message || String(err);
          console.warn(`[Craig AI] Ошибка DeepSeek (${model.id}):`, lastErrorDetails);
        }
      }
    } else if (model.provider === 'openrouter') {
      if (openrouterKeys.length === 0) continue;
      for (const key of openrouterKeys) {
        try {
          console.log(`[Craig AI] Запрос к OpenRouter (${model.id})...`);
          const res = await callOpenRouter(model.id, key, history, systemPrompt);
          console.log(`✅ [Craig AI] Успех от OpenRouter:`, res);
          return res;
        } catch (err: any) {
          lastStatusCode = err.code || '500';
          lastErrorDetails = err.message || String(err);
          console.warn(`[Craig AI] Ошибка OpenRouter (${model.id}):`, lastErrorDetails);
        }
      }
    } else if (model.provider === 'gemini') {
      if (geminiKeys.length === 0) continue;
      for (const key of geminiKeys) {
        try {
          console.log(`[Craig AI] Запрос к Gemini (${model.id})...`);
          const res = await callGemini(model.id, key, history, systemPrompt);
          console.log(`✅ [Craig AI] Успех от Gemini:`, res);
          return res;
        } catch (err: any) {
          lastStatusCode = err.code || '500';
          lastErrorDetails = err.message || String(err);
          console.warn(`[Craig AI] Ошибка Gemini (${model.id}):`, lastErrorDetails);
          if (err.code === 429) break; // переключаемся на следующий ключ/модель
        }
      }
    }
  }

  throw new CraigApiError(lastErrorDetails || 'Все доступные провайдеры (DeepSeek, OpenRouter, Gemini) временно недоступны.', lastStatusCode);
}
