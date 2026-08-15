import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

export const GameScreen: React.FC = () => {
  const writeContainer = useRef<HTMLDivElement | null>(null);
  const [isWriteLoaded, setIsWriteLoaded] = useState(false);

  useEffect(() => {
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    // Загрузка Write.json
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
    console.log(`Ответ игрока: ${answer}`);
  };

  return (
    <main className="game-screen-container">
      {/* Верхний блок: Write.json слева + Вопрос справа */}
      <div className="game-header-card">
        <div className="game-lottie-slot">
          {!isWriteLoaded && <div className="ios-skeleton-box mini" />}
          <div 
            ref={writeContainer} 
            className={`lottie-player ${isWriteLoaded ? 'visible' : 'hidden'}`} 
          />
        </div>

        <div className="game-question-block">
          <h2 className="game-question-badge">Вопрос 1</h2>
          <p className="game-question-text">
            Твой персонаж — реальный человек?
          </p>
        </div>
      </div>

      {/* 4 кнопки ответов в столбик */}
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
