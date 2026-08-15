import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { askCraig, AIResponse, ChatMessage } from '../services/gemini';

const THINKING_PHRASES = [
  'Хм, дай мне подумать…',
  'Анализирую совпадения…',
  'Сверяю базу персонажей…',
  'Интересно... Кажется, я близко…',
  'Отсекаю лишних кандидатов…'
];

interface GameScreenProps {
  onRestart: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onRestart }) => {
  const writeContainer = useRef<HTMLDivElement | null>(null);
  const thinkingContainer = useRef<HTMLDivElement | null>(null);

  const [isWriteLoaded, setIsWriteLoaded] = useState(false);
  const [isThinkingLoaded, setIsThinkingLoaded] = useState(false);

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAI, setCurrentAI] = useState<AIResponse>({
    reflection: '',
    qunumber: 1,
    answer: 'Твой персонаж существует в реальном мире?',
    character: null
  });

  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0]);

  // Защита от мисклика (5 секунд)
  const [countdown, setCountdown] = useState<number>(5.0);
  const [isLocked, setIsLocked] = useState<boolean>(true);

  // Для мармеладного перехода номера вопроса
  const [prevQNumber, setPrevQNumber] = useState<number>(1);
  const [numberAnimKey, setNumberAnimKey] = useState<number>(0);

  // 1. Инициализация Lottie Write.json
  useEffect(() => {
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;
    fetch(`/Write.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((animationData) => {
        if (!writeContainer.current) return;
        anim = lottie.loadAnimation({
          container: writeContainer.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        });
        setIsWriteLoaded(true);
      })
      .catch(() => setIsWriteLoaded(false));

    return () => anim?.destroy();
  }, []);

  // 2. Инициализация Lottie Thinking.json при переходе в режим раздумий
  useEffect(() => {
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;
    if (isThinking) {
      fetch(`/Thinking.json?t=${Date.now()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((animationData) => {
          if (!thinkingContainer.current) return;
          anim = lottie.loadAnimation({
            container: thinkingContainer.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData,
          });
          setIsThinkingLoaded(true);
        })
        .catch(() => setIsThinkingLoaded(false));
    }
    return () => anim?.destroy();
  }, [isThinking]);

  // 3. Первый вопрос от Крегга при старте игры
  useEffect(() => {
    const startInitialQuestion = async () => {
      setIsThinking(true);
      setThinkingPhrase('Крегг настраивается на твои мысли…');
      try {
        const initialUserMsg: ChatMessage = {
          role: 'user',
          parts: [{ text: 'Я загадал персонажа. Начни игру и задай первый фундаментальный вопрос.' }]
        };
        const firstAI = await askCraig([initialUserMsg]);
        setCurrentAI(firstAI);
        setHistory([
          initialUserMsg,
          { role: 'model', parts: [{ text: JSON.stringify(firstAI) }] }
        ]);
      } catch (err) {
        console.error('Ошибка старта игры:', err);
        // Резервный вопрос
        setCurrentAI({
          reflection: 'Стартовый вопрос',
          qunumber: 1,
          answer: 'Твой персонаж существует в реальном мире?',
          character: null
        });
      } finally {
        setIsThinking(false);
      }
    };

    startInitialQuestion();
  }, []);

  // 4. Таймер защиты от мисклика (5.0s) на каждый новый вопрос
  useEffect(() => {
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
  }, [currentAI.qunumber, currentAI.answer]);

  // 5. Обработка ответа игрока
  const handleUserAnswer = async (answerText: string) => {
    if (isLocked || isThinking) return;

    if (currentAI.character && answerText === 'Да, угадал!') {
      alert(`🎉 Крегг победил! Персонаж: ${currentAI.character}`);
      onRestart();
      return;
    }

    // Случайная фраза мышления
    const randomPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    setThinkingPhrase(randomPhrase);
    setIsThinking(true);

    const newHistory: ChatMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: `Ответ игрока на вопрос ${currentAI.qunumber}: "${answerText}"` }] }
    ];

    try {
      const nextAI = await askCraig(newHistory);
      
      setPrevQNumber(currentAI.qunumber);
      setNumberAnimKey((k) => k + 1);
      setCurrentAI(nextAI);
      
      setHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: JSON.stringify(nextAI) }] }
      ]);
    } catch (err) {
      console.error('Ошибка запроса:', err);
    } finally {
      setIsThinking(false);
    }
  };

  const isGuessMode = Boolean(currentAI.character);

  return (
    <main className="game-screen-container">
      {/* 1. РЕЖИМ МЫШЛЕНИЯ КРЕГГА */}
      {isThinking ? (
        <div className="thinking-screen-view">
          <div className="thinking-lottie-slot">
            {!isThinkingLoaded && <div className="ios-skeleton-box game-mock" />}
            <div 
              ref={thinkingContainer} 
              className={`lottie-player ${isThinkingLoaded ? 'visible' : 'hidden'}`} 
            />
          </div>

          <div className="thinking-text-animated">
            {thinkingPhrase.split('').map((char, i) => (
              <span key={i} className="jelly-char" style={{ animationDelay: `${i * 35}ms` }}>
                {char}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* 2. РЕЖИМ ВОПРОСА / ДОГАДКИ */
        <div className="game-active-view">
          <div className="game-header-area">
            <div className="game-lottie-slot">
              {!isWriteLoaded && <div className="ios-skeleton-box game-mock" />}
              <div 
                ref={writeContainer} 
                className={`lottie-player ${isWriteLoaded ? 'visible' : 'hidden'}`} 
              />
            </div>

            <div className="game-question-block">
              {/* Мармеладный переход номера вопроса */}
              <div className="question-number-slider">
                <span key={numberAnimKey} className="game-question-badge jelly-slide-in">
                  {isGuessMode ? 'Финальная догадка' : `Вопрос ${currentAI.qunumber}`}
                </span>
              </div>

              {/* Появление текста вопроса */}
              <p key={currentAI.answer} className="game-question-text">
                {currentAI.answer.split(' ').map((word, wIdx) => (
                  <span 
                    key={wIdx} 
                    className="jelly-word" 
                    style={{ animationDelay: `${wIdx * 65}ms` }}
                  >
                    {word}&nbsp;
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* Чистое пустое пространство */}
          <div className="game-spacer" />

          {/* Кнопки ответов с защитой от мисклика */}
          <div className="game-buttons-group">
            {isGuessMode ? (
              <>
                <button 
                  type="button" 
                  className={`ios-glass-btn win-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Да, угадал!')}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Да, угадал!'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Нет, продолжить')}
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
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Да'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Нет')}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Нет'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Частично')}
                >
                  {isLocked ? `${countdown.toFixed(1)}` : 'Частично'}
                </button>

                <button 
                  type="button" 
                  className={`ios-glass-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleUserAnswer('Я не знаю')}
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
