import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

export const GameScreen: React.FC = () => {
  const writeContainer = useRef<HTMLDivElement | null>(null);
  const [isWriteLoaded, setIsWriteLoaded] = useState(false);
  const questionNumber = 1;

  useEffect(() => {
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    fetch(`/Write.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Write.json не найден');
        return res.json();
      })
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
      .catch(() => {
        setIsWriteLoaded(false);
      });

    return () => {
      anim?.destroy();
    };
  }, []);

  const handleAnswer = (answer: string) => {
    console.log(`Ответ: ${answer}`);
  };

  return (
    <main className="game-screen-container">
      {/* Верхний блок: без рамок и фона, увеличенный размер */}
      <div className="game-header-area">
        <div className="game-lottie-slot">
          {!isWriteLoaded && <div className="ios-skeleton-box game-mock" />}
          <div 
            ref={writeContainer} 
            className={`lottie-player ${isWriteLoaded ? 'visible' : 'hidden'}`} 
          />
        </div>

        <div className="game-question-block">
          {/* Скругленный заголовок */}
          <span className="game-question-badge">
            Вопрос {questionNumber}
          </span>
          <p className="game-question-text">
            Твой персонаж — реальный человек?
          </p>
        </div>
      </div>

      {/* Заполнение пространства: деликатный AI-импульс мыслей */}
      <div className="ai-thought-space">
        <div className="thought-bars">
          <span className="bar b1" />
          <span className="bar b2" />
          <span className="bar b3" />
          <span className="bar b4" />
          <span className="bar b5" />
        </div>
      </div>

      {/* 4 кнопки ответов */}
      <div className="game-buttons-group">
        <button 
          type="button" 
          className="ios-glass-btn"
          onClick={() => handleAnswer('Да')}
        >
          Да
        </button>

        <button 
          type="button" 
          className="ios-glass-btn"
          onClick={() => handleAnswer('Нет')}
        >
          Нет
        </button>

        <button 
          type="button" 
          className="ios-glass-btn"
          onClick={() => handleAnswer('Частично')}
        >
          Частично
        </button>

        <button 
          type="button" 
          className="ios-glass-btn"
          onClick={() => handleAnswer('Я не знаю')}
        >
          Я не знаю
        </button>
      </div>
    </main>
  );
};
