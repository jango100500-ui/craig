import React, { useEffect, useState } from 'react';

const LETTERS = 'Загрузка'.split('');

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [fillProgress, setFillProgress] = useState(0);
  const [duration, setDuration] = useState(2000);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const randomDuration = Math.floor(Math.random() * 2000) + 1000;
    setDuration(randomDuration);

    const startTimer = setTimeout(() => {
      setFillProgress(100);
    }, 150);

    // Запуск «растемнения» после окончания заполнения
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, randomDuration + 200);

    // Полное переключение на игру после растворения экрана
    const completeTimer = setTimeout(() => {
      onComplete();
    }, randomDuration + 700);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`loading-screen ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-icon-wrapper">
          <img 
            src="/icon.png" 
            alt="Craig Logo" 
            className="loading-icon base" 
          />
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
