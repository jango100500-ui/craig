import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { LoadingScreen } from './components/LoadingScreen';
import { GameScreen } from './components/GameScreen';
import { SettingsScreen } from './components/SettingsScreen';

const BUTTON_OPTIONS = [
  'Я загадал!',
  'Начнем игру!',
  'Загадал!',
  'Поехали!'
];

export const App: React.FC = () => {
  const lottieContainer = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'loading' | 'game'>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      .then((res) => (res.ok ? res.json() : Promise.reject()))
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

    return () => anim?.destroy();
  }, []);

  return (
    <>
      <div className="landscape-lock-overlay">
        <h2>Пожалуйста, поверните устройство</h2>
        <p>Приложение работает только в вертикальном режиме</p>
      </div>

      {/* Экран настроек */}
      {isSettingsOpen && (
        <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Оверлей загрузки */}
      {currentScreen === 'loading' && (
        <LoadingScreen onComplete={() => setCurrentScreen('game')} />
      )}

      {/* Экран игры */}
      {currentScreen === 'game' && (
        <GameScreen onRestart={() => setCurrentScreen('home')} />
      )}

      {/* Главный экран */}
      {currentScreen === 'home' && (
        <>
          {/* Круглая стеклянная кнопка настроек в правом верхнем углу */}
          <button 
            type="button" 
            className="home-settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Настройки"
          >
            <img 
              src="/settings.png" 
              alt=""
              className="settings-icon-img"
              onError={(e) => {
                // Если картинки нет — скрываем битую картинку
                (e.target as HTMLElement).style.display = 'none';
              }} 
            />
            {/* Резервная SVG шестеренка */}
            <svg className="settings-svg-fallback" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

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
              onClick={() => setCurrentScreen('loading')}
            >
              {buttonText}
            </button>
          </main>
        </>
      )}
    </>
  );
};

export default App;
