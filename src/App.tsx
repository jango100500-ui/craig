import React from 'react';
import { PhysicsPills } from './components/PhysicsPills';

export const App: React.FC = () => {
  const handleStart = () => {
    console.log('Игрок нажал "Я загадал!"');
  };

  return (
    <>
      {/* Слой с физикой падающих колбочек */}
      <PhysicsPills />

      {/* Интерфейс приложения поверх физики */}
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
