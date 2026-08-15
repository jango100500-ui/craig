import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { LoadingScreen } from './components/LoadingScreen';

const BUTTON_OPTIONS = [
  'Я загадал!',
  'Начнем игру!',
  'Загадал!',
  'Поехали!'
];

export const App: React.FC = () => {
  const lottieContainer = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'loading'>('home');

  // Выбираем случайную надпись для кнопки при старте
  const [buttonText] = useState(() => {
    const randomIndex = Math.floor(Math.random() * BUTTON_OPTIONS.length);
    return BUTTON_OPTIONS[randomIndex];
  });

  useEffect(() => {
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.screen.orientation as any).lock('portrait').catch(() => {});
    }

    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    fetch(`/Hi.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Файл Hi.json не найден');
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
    // Переход на экран загрузки
    setCurrentScreen('loading');
  };

  return (
    <>
      <div className="landscape-lock-overlay">
        <h2>Пожалуйста, поверните устройство</h2>
        <p>Приложение работает только в вертикальном режиме</p>
      </div>

      {currentScreen === 'loading' ? (
        <LoadingScreen />
      ) : (
        <main className="screen-container">
          <div className="animation-slot">
            {!isLoaded && <div className="ios-skeleton-box" />}
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
            {buttonText}
          </button>
        </main>
      )}
    </>
  );
};

export default App;
