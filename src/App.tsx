import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

export const App: React.FC = () => {
  const lottieContainer = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Блокировка ориентации на мобильных устройствах
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.screen.orientation as any).lock('portrait').catch(() => {});
    }

    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    // Загрузка Lottie с кэш-бастингом для надежности
    fetch(`/hi.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Файл hi.json не найден');
        return res.json();
      })
      .then((animationData) => {
        if (!lottieContainer.current) return;

        anim = lottie.loadAnimation({
          container: lottieContainer.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        });

        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(false);
      });

    return () => {
      anim?.destroy();
    };
  }, []);

  const handleStart = () => {
    console.log('Игрок нажал "Я загадал!"');
  };

  return (
    <>
      {/* Заглушка при горизонтальном повороте */}
      <div className="landscape-lock-overlay">
        <h2>Пожалуйста, поверните устройство</h2>
        <p>Приложение работает только в вертикальном режиме</p>
      </div>

      <main className="screen-container">
        {/* Блок анимации / Скелетон */}
        <div className="animation-slot">
          {/* Скелетон (показывается пока нет анимации или идет загрузка) */}
          {!isLoaded && <div className="ios-skeleton-box" />}

          {/* Контейнер для Lottie */}
          <div 
            ref={lottieContainer} 
            className={`lottie-player ${isLoaded ? 'visible' : 'hidden'}`} 
          />
        </div>

        <div className="text-group">
          <h1 className="hero-title">
            Загадай любого персонажа
          </h1>
          <p className="hero-subtitle">
            Это может быть реальный человек, герой фильма, сериала, игры или аниме. Я задам несколько вопросов и попробую угадать, кого ты задумал
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
