import React, { useEffect, useState } from 'react';
import { askCraig, AIResponse, ChatMessage } from '../services/gemini';
import { LottieIcon } from './LottieIcon';
import { ReflectionItem } from './ReflectionsScreen';

const THINKING_PHRASES = [
  'Хм, дай мне подумать…',
  'Анализирую совпадения…',
  'Сверяю базу персонажей…',
  'Интересно... Кажется, я близко…',
  'Отсекаю лишних кандидатов…'
];

interface GameScreenProps {
  onWin: (reflections: ReflectionItem[]) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onWin }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAI, setCurrentAI] = useState<AIResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Список всех размышлений за игру
  const [reflectionsList, setReflectionsList] = useState<ReflectionItem[]>([]);

  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0]);

  // Защита от мисклика (5.0s)
  const [countdown, setCountdown] = useState<number>(5.0);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [numberAnimKey, setNumberAnimKey] = useState<number>(0);

  // Первый вопрос
  const startInitialQuestion = async () => {
    setIsThinking(true);
    setErrorMessage(null);
    setThinkingPhrase('Крегг подключается к разуму…');

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
      setErrorMessage(err.message || 'Ошибка подключения к ИИ');
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    startInitialQuestion();
  }, []);

  // Таймер защиты от мисклика
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

  // Обработка ответа
  const handleUserAnswer = async (answerText: string) => {
    if (isLocked || isThinking || !currentAI) return;

    // Пользователь подтвердил победу Крегга
    if (currentAI.character && answerText === 'Да, угадал!') {
      onWin(reflectionsList);
      return;
    }

    const randomPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    setThinkingPhrase(randomPhrase);
    setIsThinking(true);
    setErrorMessage(null);

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
      setErrorMessage(err.message || 'Ошибка генерации ответа');
    } finally {
      setIsThinking(false);
    }
  };

  const isGuessMode = Boolean(currentAI?.character);

  return (
    <main className="game-screen-container">
      {errorMessage ? (
        <div className="game-error-view">
          <div className="game-error-icon">⚠️</div>
          <h2 className="game-error-title">Сбой запроса</h2>
          <p className="game-error-text">{errorMessage}</p>
          <button 
            type="button" 
            className="ios-glass-btn"
            onClick={startInitialQuestion}
          >
            Повторить запрос
          </button>
        </div>
      ) : isThinking ? (
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
        <div className="game-active-view">
          <div className="game-header-area">
            <div className="game-lottie-slot">
              <LottieIcon 
                src="/Write.json" 
                className="game-write-lottie-host" 
                fallbackClass="game-mock" 
              />
            </div>

            <div className="game-question-block">
              {!currentAI ? (
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
          </div>
        </div>
      )}
    </main>
  );
};
