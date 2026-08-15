import React, { useEffect, useState } from 'react';
import { askCraig, AIResponse, ChatMessage } from '../services/gemini';
import { LottieIcon } from './LottieIcon';

const THINKING_PHRASES = [
  'Хм, дай мне подумать…',
  'Анализирую совпадения…',
  'Сверяю базу персонажей…',
  'Интересно... Кажется, я близко…',
  'Отсекаю лишних кандидатов…'
];

// Умные резервные вопросы бинарного поиска (если нет связи с API)
const FALLBACK_QUESTIONS = [
  'Твой персонаж существует в реальном мире?',
  'Этот персонаж мужского пола?',
  'Он связан с кинематографом или сериалами?',
  'Обладает ли он сверхчеловеческими способностями?',
  'Этот персонаж является главным героем своей истории?',
  'Он носит маску, шлем или плащ?',
  'Ты загадал Бэтмена (Брюса Уэйна)?'
];

interface GameScreenProps {
  onRestart: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onRestart }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAI, setCurrentAI] = useState<AIResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0]);

  // Защита от мисклика (5.0s)
  const [countdown, setCountdown] = useState<number>(5.0);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [numberAnimKey, setNumberAnimKey] = useState<number>(0);

  // 1. Первый вопрос от Крегга
  useEffect(() => {
    const startInitialQuestion = async () => {
      setIsInitialLoading(true);
      const initialUserMsg: ChatMessage = {
        role: 'user',
        parts: [{ text: 'Я загадал персонажа. Начни игру и задай первый фундаментальный вопрос.' }]
      };

      try {
        const firstAI = await askCraig([initialUserMsg]);
        setCurrentAI(firstAI);
        setHistory([
          initialUserMsg,
          { role: 'model', parts: [{ text: JSON.stringify(firstAI) }] }
        ]);
      } catch (err) {
        console.warn('Использован стартовый вопрос:', err);
        const fallbackAI: AIResponse = {
          reflection: 'Стартовый бинарный вопрос',
          qunumber: 1,
          answer: FALLBACK_QUESTIONS[0],
          character: null
        };
        setCurrentAI(fallbackAI);
        setHistory([
          initialUserMsg,
          { role: 'model', parts: [{ text: JSON.stringify(fallbackAI) }] }
        ]);
      } finally {
        setIsInitialLoading(false);
      }
    };

    startInitialQuestion();
  }, []);

  // 2. Таймер защиты от мисклика на каждый новый вопрос
  useEffect(() => {
    if (!currentAI) return;
    setIsLocked(true);
    setCountdown(5.0);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          setIsLocked(false);
          return 0;
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentAI?.qunumber, currentAI?.answer]);

  // 3. Отправка ответа игрока
  const handleUserAnswer = async (answerText: string) => {
    if (isLocked || isThinking || !currentAI) return;

    if (currentAI.character && answerText === 'Да, угадал!') {
      alert(`🎉 Крегг угадал твоего персонажа: ${currentAI.character}!`);
      onRestart();
      return;
    }

    const randomPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    setThinkingPhrase(randomPhrase);
    setIsThinking(true);

    const nextQNum = (currentAI.qunumber || 1) + 1;
    const userReplyMsg: ChatMessage = {
      role: 'user',
      parts: [{ text: `Ответ игрока на вопрос ${currentAI.qunumber} ("${currentAI.answer}"): "${answerText}". Задай следующий вопрос ${nextQNum}.` }]
    };

    const updatedHistory: ChatMessage[] = [...history, userReplyMsg];

    try {
      const nextAI = await askCraig(updatedHistory);
      
      // Страховка от сбоя счетчика
      if (nextAI.qunumber <= currentAI.qunumber) {
        nextAI.qunumber = nextQNum;
      }

      setNumberAnimKey((k) => k + 1);
      setCurrentAI(nextAI);
      setHistory([
        ...updatedHistory,
        { role: 'model', parts: [{ text: JSON.stringify(nextAI) }] }
      ]);
    } catch (err) {
      console.warn('[Craig] Ошибка API, активирован резервный вопрос:', err);
      
      // Динамический переход к следующему вопросу из цепочки
      const fallbackIdx = Math.min(nextQNum - 1, FALLBACK_QUESTIONS.length - 1);
      const isFinalFallback = fallbackIdx === FALLBACK_QUESTIONS.length - 1;

      const fallbackNext: AIResponse = {
        reflection: 'Резервная цепочка бинарного поиска',
        qunumber: nextQNum,
        answer: FALLBACK_QUESTIONS[fallbackIdx],
        character: isFinalFallback ? 'Бэтмен (Брюс Уэйн)' : null
      };

      setNumberAnimKey((k) => k + 1);
      setCurrentAI(fallbackNext);
      setHistory([
        ...updatedHistory,
        { role: 'model', parts: [{ text: JSON.stringify(fallbackNext) }] }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const isGuessMode = Boolean(currentAI?.character);

  return (
    <main className="game-screen-container">
      {/* 1. ЭКРАН РАЗДУМИЙ КРЕГГА */}
      {isThinking ? (
        <div className="thinking-screen-view">
          <div className="thinking-lottie-slot">
            <LottieIcon 
              src="/Thinking.json" 
              className="thinking-lottie-host" 
              fallbackClass="game-mock" 
            />
          </div>

          <div className="thinking-text-animated">
            {thinkingPhrase.split('').map((char, i) => (
              <span key={i} className="jelly-char" style={{ animationDelay: `${i * 30}ms` }}>
                {char}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* 2. ЭКРАН ВОПРОСА */
        <div className="game-active-view">
          <div className="game-header-area">
            {/* Анимация Write.json */}
            <div className="game-lottie-slot">
              <LottieIcon 
                src="/Write.json" 
                className="game-write-lottie-host" 
                fallbackClass="game-mock" 
              />
            </div>

            {/* Текст вопроса и номер */}
            <div className="game-question-block">
              {isInitialLoading || !currentAI ? (
                <div className="question-skeleton-group">
                  <div className="text-skeleton-line short" />
                  <div className="text-skeleton-line full" />
                  <div className="text-skeleton-line medium" />
                </div>
              ) : (
                <>
                  <div className="question-number-slider">
                    <span key={numberAnimKey} className="game-question-badge jelly-slide-in">
                      {isGuessMode ? 'Финальная догадка' : `Вопрос ${currentAI.qunumber}`}
                    </span>
                  </div>

                  <p key={currentAI.answer} className="game-question-text">
                    {currentAI.answer.split(' ').map((word, wIdx) => (
                      <span 
                        key={wIdx} 
                        className="jelly-word" 
                        style={{ animationDelay: `${wIdx * 50}ms` }}
                      >
                        {word}&nbsp;
                      </span>
                    ))}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="game-compact-spacer" />

          {/* Кнопки ответов */}
          <div className="game-buttons-group">
            {isGuessMode ? (
              <>
                <button 
                  type="button" 
                  className={`ios-glass-btn win-btn ${isLocked || isInitialLoading ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Да, угадал!')}
                  disabled={isLocked || isInitialLoading}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Да, угадал!'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked || isInitialLoading ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Нет, продолжить')}
                  disabled={isLocked || isInitialLoading}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Нет, продолжить'}
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked || isInitialLoading ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Да')}
                  disabled={isLocked || isInitialLoading}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Да'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked || isInitialLoading ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Нет')}
                  disabled={isLocked || isInitialLoading}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Нет'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked || isInitialLoading ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Частично')}
                  disabled={isLocked || isInitialLoading}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Частично'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked || isInitialLoading ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Я не знаю')}
                  disabled={isLocked || isInitialLoading}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Я не знаю'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
