import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

export const App: React.FC = () => {
  const lottieContainer = useRef<HTMLDivElement | null>(null);
  const [lottieLoaded, setLottieLoaded] = useState(false);

  useEffect(() => {
    // Блокировка ориентации на поддерживаемых устройствах
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.screen.orientation as any).lock('portrait').catch(() => {});
    }

    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    // Пытаемся безопасно загрузить hi.json
    fetch('/hi.json')
      .then((res) => {
        if (!res.ok) throw new Error('hi.json не найден');
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

        setLottieLoaded(true);
      })
      .catch(() => {
        // Если файла нет или оффлайн — остаемся на моковом аватаре
        setLottieLoaded(false);
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
        {/* Контейнер анимации / Моковый аватар */}
        <div className="lottie-wrapper">
          {/* Сюда монтируется Lottie, если файл hi.json есть */}
          <div 
            ref={lottieContainer} 
            className={`lottie-player ${lottieLoaded ? 'visible' : 'hidden'}`} 
          />

          {/* Моковый красивый iOS Glass Orb (если файла нет или идет загрузка) */}
          {!lottieLoaded && (
            <div className="mock-orb">
              <div className="mock-orb-core" />
              <div className="mock-orb-ring" />
              <div className="mock-orb-sparkle">✦</div>
            </div>
          )}
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
