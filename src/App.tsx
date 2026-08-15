import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

export const App: React.FC = () => {
  const lottieContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Блокировка ориентации на поддерживаемых устройствах
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.screen.orientation as any).lock('portrait').catch(() => {});
    }

    // Инициализация Lottie-анимации из public/hi.json
    if (!lottieContainer.current) return;

    const anim = lottie.loadAnimation({
      container: lottieContainer.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/hi.json',
    });

    return () => {
      anim.destroy();
    };
  }, []);

  const handleStart = () => {
    console.log('Игрок нажал "Я загадал!"');
  };

  return (
    <>
      {/* Заглушка при горизонтальном повороте смартфона */}
      <div className="landscape-lock-overlay">
        <h2>Пожалуйста, поверните устройство</h2>
        <p>Приложение работает только в вертикальном режиме</p>
      </div>

      <main className="screen-container">
        {/* Lottie-анимация над заголовком */}
        <div ref={lottieContainer} className="lottie-wrapper" />

        <div className="text-group">
          <h1 className="hero-title">
            Загадай любого персонажа
          </h1>
          <p className="hero-subtitle">
            Это может быть реальный человек, герой фильма, сериала, игры или аниме. Я задам несколько вопросов и попробую угадать, кого ты задумал.
          </p>
        </div>

        <button 
          type="button" 
          className="ios-glass-btn"
          onClick={handleStart}
        >
          Я загадал!
        </button>
      </main>
    </>
  );
};

export default App;
