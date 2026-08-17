import React, { useEffect, useState } from 'react';
import { askCraig, AIResponse, ChatMessage, CraigApiError, deductEnergyForGame } from '../services/gemini';
import { LottieIcon } from './LottieIcon';
import { ReflectionItem } from './ReflectionsScreen';

const INITIAL_PHRASES = [
  'Крегг готовит список вопросов…',
  'Крегг будет здесь через секундочку…',
  'Крегг готовится к своей неминуемой победе…',
  'Крегг изучает твою ауру…',
  'Крегг уже знает, как тебя обыграть…'
];

const THINKING_PHRASES = [
  'Хм, дай мне подумать…',
  'Анализирую совпадения…',
  'Сверяю базу персонажей…',
  'Интересно... Кажется, я близко…',
  'Отсекаю лишних кандидатов…'
];

const ERROR_PHRASES = [
  'Упс! Возникла ошибка!',
  'Ой, запиночка!',
  'Что-то пошло не так!',
  'Крегг наткнулся на преграду!'
];

interface GameScreenProps {
  onWin: (reflections: ReflectionItem[]) => void;
  onRestart: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onWin, onRestart }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAI, setCurrentAI] = useState<AIResponse | null>(null);
  
  const [errorCode, setErrorCode] = useState<string | number | null>(null);
  const [errorPhrase] = useState(() => {
    return ERROR_PHRASES[Math.floor(Math.random() * ERROR_PHRASES.length)];
  });

  const [reflectionsList, setReflectionsList] = useState<ReflectionItem[]>([]);

  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState(() => {
    return INITIAL_PHRASES[Math.floor(Math.random() * INITIAL_PHRASES.length)];
  });

  const [countdown, setCountdown] = useState<number>(5.0);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [numberAnimKey, setNumberAnimKey] = useState<number>(0);

  const startInitialQuestion = async () => {
    setIsThinking(true);
    setErrorCode(null);
    const startPhrase = INITIAL_PHRASES[Math.floor(Math.random() * INITIAL_PHRASES.length)];
    setThinkingPhrase(startPhrase);

    deductEnergyForGame();

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
      
      if (firstAI.reflection) {
        setReflectionsList([
          {
            qunumber: firstAI.qunumber,
            question: firstAI.answer,
            reflection: firstAI.reflection
          }
        ]);
      }
    } catch (err: any) {
      console.error('[Craig Error]', err);
      setErrorCode(err instanceof CraigApiError ? err.code : '500');
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    startInitialQuestion();
  }, []);

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

  const handleUserAnswer = async (answerText: string) => {
    if (isLocked || isThinking || !currentAI) return;

    if (currentAI.character && answerText === 'Да, угадал!') {
      onWin(reflectionsList);
      return;
    }

    const randomPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    setThinkingPhrase(randomPhrase);
    setIsThinking(true);
    setErrorCode(null);

    const nextQNum = (currentAI.qunumber || 1) + 1;
    const userReplyMsg: ChatMessage = {
      role: 'user',
      parts: [{ text: `Ответ игрока на вопрос ${currentAI.qunumber} ("${currentAI.answer}"): "${answerText}". Задай следующий вопрос ${nextQNum}.` }]
    };

    const updatedHistory: ChatMessage[] = [...history, userReplyMsg];

    try {
      const nextAI = await askCraig(updatedHistory);
      
      if (nextAI.qunumber <= currentAI.qunumber) {
        nextAI.qunumber = nextQNum;
      }

      setNumberAnimKey((k) => k + 1);
      setCurrentAI(nextAI);
      setHistory([
        ...updatedHistory,
        { role: 'model', parts: [{ text: JSON.stringify(nextAI) }] }
      ]);

      if (nextAI.reflection) {
        setReflectionsList((prev) => [
          ...prev,
          {
            qunumber: nextAI.qunumber,
            question: nextAI.answer,
            reflection: nextAI.reflection
          }
        ]);
      }
    } catch (err: any) {
      console.error('[Craig Error]', err);
      setErrorCode(err instanceof CraigApiError ? err.code : '500');
    } finally {
      setIsThinking(false);
    }
  };

  const isGuessMode = Boolean(currentAI?.character);
  const answerLength = currentAI?.answer?.length || 0;

  // Динамический размер текста вопроса
  let dynamicTextClass = 'text-size-lg';
  if (answerLength > 75) dynamicTextClass = 'text-size-sm';
  else if (answerLength > 45) dynamicTextClass = 'text-size-md';

  return (
    <main className="game-screen-container">
      {/* 1. ЭКРАН ОШИБКИ */}
      {errorCode !== null ? (
        <div className="game-error-view">
          <div className="error-content-block">
            <div className="error-lottie-slot">
              <LottieIcon 
                src="/Error.json" 
                className="error-lottie-host" 
                fallbackClass="ios-skeleton-box" 
              />
            </div>

            <div className="error-text-block">
              <h2 className="error-phrase-title">{errorPhrase}</h2>
              <p className="error-code-text">Код ошибки — {errorCode}</p>
            </div>
          </div>

          <div className="error-buttons-group">
            <button 
              type="button" 
              className="ios-glass-btn"
              onClick={onRestart}
            >
              На главную
            </button>
          </div>
        </div>
      ) : isThinking ? (
        /* 2. ЭКРАН РАЗДУМИЙ */
        <div className="thinking-screen-view">
          <div className="thinking-lottie-slot">
            <LottieIcon 
              src="/Thinking.json" 
              className="thinking-lottie-host" 
              fallbackClass="game-mock" 
            />
          </div>

          <div className="thinking-text-animated">
            {thinkingPhrase.split(' ').map((word, wIdx) => (
              <span key={wIdx} className="thinking-word">
                {word.split('').map((char, cIdx) => (
                  <span 
                    key={cIdx} 
                    className="jelly-char" 
                    style={{ animationDelay: `${(wIdx * 120) + (cIdx * 35)}ms` }}
                  >
                    {char}
                  </span>
                ))}
                &nbsp;
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* 3. ЭКРАН ВОПРОСА С ФОНОМ BACKGROUND.PNG И ЦЕНТРАЛЬНЫМ ДЖСОНОМ */
        <div className="game-active-view">
          <div className="game-question-hero-card">
            {/* Фоновые знаки вопроса Background.png (прозрачность 0.25) */}
            <div className="question-bg-art">
              <img src="/Background.png" alt="" className="question-bg-img" />
            </div>

            {/* Центральный крупный Write.json */}
            <div className="game-lottie-hero-slot">
              <LottieIcon 
                src="/Write.json" 
                className="game-write-lottie-hero" 
                fallbackClass="game-mock" 
              />
            </div>

            <div className="game-question-text-area">
              {!currentAI ? (
                <div className="question-skeleton-group">
                  <div className="text-skeleton-line short" />
                  <div className="text-skeleton-line full" />
                </div>
              ) : (
                <>
                  <div className="question-number-slider">
                    <span key={numberAnimKey} className="game-question-badge jelly-slide-in">
                      {isGuessMode ? 'Финальная догадка' : `Вопрос ${currentAI.qunumber}`}
                    </span>
                  </div>

                  <p key={currentAI.answer} className={`game-question-text ${dynamicTextClass}`}>
                    {currentAI.answer.split(' ').map((word, wIdx) => (
                      <span 
                        key={wIdx} 
                        className="jelly-word" 
                        style={{ animationDelay: `${wIdx * 45}ms` }}
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
                  className={`ios-glass-btn win-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Да, угадал!')}
                  disabled={isLocked}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Да, угадал!'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Нет, продолжить')}
                  disabled={isLocked}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Нет, продолжить'}
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Да')}
                  disabled={isLocked}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Да'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Нет')}
                  disabled={isLocked}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Нет'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Частично')}
                  disabled={isLocked}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Частично'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Я не знаю')}
                  disabled={isLocked}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Я не знаю'}
                </button>
              </>
            )}

            {/* СОВЕТ ПОД КНОПКАМИ С ИКОНКОЙ BULB.PNG */}
            <div className="game-advice-row">
              <img src="/Bulb.png" alt="" className="advice-bulb-icon" />
              <span className="advice-text">
                Не уверен? Выбирай «Частично» или «Я не знаю»
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
