import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { GameScreen } from './components/GameScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { WinScreen } from './components/WinScreen';
import { ReflectionsScreen, ReflectionItem } from './components/ReflectionsScreen';

const BUTTON_OPTIONS = [
  'Я загадал!',
  'Начнем игру!',
  'Загадал!',
  'Поехали!'
];

type AppScreen = 'home' | 'game' | 'win' | 'reflections';

export const App: React.FC = () => {
  const lottieContainer = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [savedReflections, setSavedReflections] = useState<ReflectionItem[]>([]);

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

  const handleWin = (reflections: ReflectionItem[]) => {
    setSavedReflections(reflections);
    setCurrentScreen('win');
  };

  const handleRestart = () => {
    setCurrentScreen('home');
  };

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

      {/* 1. Экран игры (мгновенный переход) */}
      {currentScreen === 'game' && (
        <GameScreen onWin={handleWin} onRestart={handleRestart} />
      )}

      {/* 2. Экран победы */}
      {currentScreen === 'win' && (
        <WinScreen 
          onRestart={handleRestart}
          onViewReflections={() => setCurrentScreen('reflections')}
        />
      )}

      {/* 3. Экран размышлений */}
      {currentScreen === 'reflections' && (
        <ReflectionsScreen 
          reflections={savedReflections}
          onClose={() => setCurrentScreen('win')}
        />
      )}

      {/* 4. Главный экран */}
      {currentScreen === 'home' && (
        <>
          <button 
            type="button" 
            className="home-settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Настройки"
          >
            <img src="/Settings.png" alt="Настройки" className="settings-icon-img" />
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
              onClick={() => setCurrentScreen('game')}
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
