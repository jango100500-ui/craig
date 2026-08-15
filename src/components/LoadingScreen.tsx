import React, { useEffect, useState } from 'react';

export const LoadingScreen: React.FC = () => {
  const [typedText, setTypedText] = useState('');
  const [dots, setDots] = useState('');
  const fullWord = 'Загрузка';

  useEffect(() => {
    let index = 0;

    // 1. Быстрое посимвольное появление слова "Загрузка"
    const typeInterval = setInterval(() => {
      index++;
      setTypedText(fullWord.slice(0, index));

      if (index >= fullWord.length) {
        clearInterval(typeInterval);

        // 2. После появления слова запускаем зацикленную анимацию точек
        let dotCount = 0;
        const dotsInterval = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          setDots('.'.repeat(dotCount));
        }, 360);

        return () => clearInterval(dotsInterval);
      }
    }, 45);

    return () => clearInterval(typeInterval);
  }, []);

  return (
    <div className="loading-screen">
      {/* Центр: Иконка с заполнением сверху вниз */}
      <div className="loading-icon-wrapper">
        {/* Базовая подложка: белая, прозрачность 0.2 */}
        <img 
          src="/icon.png" 
          alt="Craig Logo" 
          className="loading-icon base" 
        />
        {/* Заполняющий слой: белая, прозрачность 0.3 */}
        <img 
          src="/icon.png" 
          alt="Craig Logo Fill" 
          className="loading-icon fill" 
        />
      </div>

      {/* Низ: Текст загрузки */}
      <div className="loading-status">
        <span className="loading-word">{typedText}</span>
        <span className="loading-dots">{dots}</span>
      </div>
    </div>
  );
};
