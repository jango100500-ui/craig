import React, { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { WinScreen } from './components/WinScreen';
import { ReflectionsScreen, ReflectionItem } from './components/ReflectionsScreen';
import { LottieIcon } from './components/LottieIcon';
import { initNotificationScheduler } from './services/notifications';

const BUTTON_OPTIONS = [
  'Я загадал!',
  'Начнем игру!',
  'Загадал!',
  'Поехали!'
];

type AppScreen = 'home' | 'game' | 'win' | 'reflections';

export const App: React.FC = () => {
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

    // Запуск фонового планировщика уведомлений
    initNotificationScheduler();
  }, []);

  const handleStartGame = () => {
    // Легкая двойная вибрация при старте
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([20, 40, 20]);
    }
    setCurrentScreen('game');
  };

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

      {isSettingsOpen && (
        <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* 1. Экран игры */}
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
          {!isSettingsOpen && (
            <button 
              type="button" 
              className="home-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Настройки"
            >
              <img src="/Settings.png" alt="Настройки" className="settings-icon-img" />
            </button>
          )}

          <main className="screen-container">
            <div className="animation-slot">
              <LottieIcon 
                src="/Hi.json" 
                className="home-lottie-host" 
                fallbackClass="ios-skeleton-box" 
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

            {/* Акцентная зеленая кнопка #87D50C */}
            <button 
              type="button" 
              className="ios-glass-btn green-accent-btn"
              onClick={handleStartGame}
            >
              {buttonText}
            </button>

            <span className="author-tagline">Создан @temkazavr</span>
          </main>
        </>
      )}
    </>
  );
};

export default App;
