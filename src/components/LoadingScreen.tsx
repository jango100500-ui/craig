import React, { useEffect, useState } from 'react';

const LETTERS = 'Загрузка'.split('');

export const LoadingScreen: React.FC = () => {
  const [fillProgress, setFillProgress] = useState(0);
  const [duration, setDuration] = useState(2000);

  useEffect(() => {
    // Случайное время заполнения от 1 до 3 секунд (1000ms - 3000ms)
    const randomDuration = Math.floor(Math.random() * 2000) + 1000;
    setDuration(randomDuration);

    // Запускаем заполнение снизу вверх через микропаузу для плавного старта
    const timer = setTimeout(() => {
      setFillProgress(100);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Иконка с заполнением снизу вверх */}
        <div className="loading-icon-wrapper">
          {/* Базовая подложка: прозрачность 0.2 */}
          <img 
            src="/icon.png" 
            alt="Craig Logo" 
            className="loading-icon base" 
          />

          {/* Заполняющий слой снизу вверх: прозрачность 0.3 */}
          <img 
            src="/icon.png" 
            alt="Craig Logo Fill" 
            className="loading-icon fill" 
            style={{
              clipPath: `inset(${100 - fillProgress}% 0 0 0)`,
              transition: `clip-path ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`
            }}
          />
        </div>

        {/* Текст сразу под иконкой с мармеладной посимвольной анимацией */}
        <div className="loading-status">
          <div className="loading-word">
            {LETTERS.map((char, index) => (
              <span 
                key={index} 
                className="jelly-char"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                {char}
              </span>
            ))}
          </div>

          <div className="loading-dots">
            <span className="jelly-dot" style={{ animationDelay: '450ms' }}>.</span>
            <span className="jelly-dot" style={{ animationDelay: '600ms' }}>.</span>
            <span className="jelly-dot" style={{ animationDelay: '750ms' }}>.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
