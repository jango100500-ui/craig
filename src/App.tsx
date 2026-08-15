import React, { useEffect } from 'react';
import { PhysicsPills } from './components/PhysicsPills';

export const App: React.FC = () => {
  useEffect(() => {
    // Блокировка ориентации на поддерживаемых устройствах
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.screen.orientation as any).lock('portrait').catch(() => {
        // Игнорируем ошибку, если браузер не поддерживает строгую блокировку
      });
    }
  }, []);

  const handleStart = () => {
    console.log('Игрок нажал "Я загадал!"');
  };

  return (
    <>
      {/* Предупреждение при горизонтальном повороте */}
      <div className="landscape-lock-overlay">
        <h2>Пожалуйста, поверните устройство</h2>
        <p>Приложение работает только в вертикальном режиме</p>
      </div>

      <PhysicsPills />

      <main className="screen-container">
        <div className="text-group">
          <h1 className="hero-title">
            Загадай любого персонажа
          </h1>
          <p className="hero-subtitle">
            Я попробую угадать его, кем бы он ни был
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
