import React from 'react';

export const App: React.FC = () => {
  const handleStartGame = () => {
    // В будущем здесь будет переход к экрану вопросов Craig
    console.log('Игра начата!');
  };

  return (
    <main className="screen-container">
      <h1 className="hero-title">
        Загадай персонажа и я постараюсь его угадать
      </h1>

      <button 
        type="button" 
        className="liquid-amber-btn"
        onClick={handleStartGame}
      >
        Я загадал!
      </button>
    </main>
  );
};

export default App;
