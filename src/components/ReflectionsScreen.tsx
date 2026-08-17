import React, { useState } from 'react';
import { LottieIcon } from './LottieIcon';

export interface ReflectionItem {
  qunumber: number;
  question: string;
  reflection: string;
}

interface ReflectionsScreenProps {
  reflections: ReflectionItem[];
  onClose: () => void;
}

export const ReflectionsScreen: React.FC<ReflectionsScreenProps> = ({ reflections, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (reflections.length === 0) return;

    const formattedText = reflections
      .map((item) => `Вопрос ${item.qunumber}\n${item.reflection.trim()}`)
      .join('\n\n');

    navigator.clipboard.writeText(formattedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="reflections-screen">
      <button 
        type="button" 
        className="settings-fixed-close-btn"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <img src="/Cross.png" alt="Закрыть" className="cross-icon-img" />
      </button>

      <div className="reflections-inner-container">
        <header className="reflections-header">
          <h2 className="reflections-screen-title">Размышления</h2>
        </header>

        <div className="reflections-scroll-container">
          {/* Интро с гифкой Bath.json и текстом «Как я догадался» */}
          <div className="reflections-hero-intro">
            <div className="reflections-bath-slot">
              <LottieIcon 
                src="/Bath.json" 
                className="reflections-bath-lottie" 
                fallbackClass="ios-skeleton-box" 
              />
            </div>
            <h3 className="reflections-intro-heading">Как я догадался</h3>
          </div>

          {reflections.length === 0 ? (
            <div className="reflections-empty">
              <p>У Крегга не осталось сохраненных мыслей за эту партию</p>
            </div>
          ) : (
            <div className="reflections-timeline">
              {reflections.map((item, index) => {
                const isLast = index === reflections.length - 1;
                return (
                  <div key={index} className="timeline-node">
                    <div className="timeline-left-col">
                      <div className="timeline-badge-circle">
                        {item.qunumber}
                      </div>
                      {!isLast && <div className="timeline-vertical-line" />}
                    </div>

                    <div className="timeline-right-col">
                      <h4 className="timeline-node-title">
                        Вопрос {item.qunumber}
                      </h4>
                      <p className="timeline-node-reflection">
                        {item.reflection || 'Анализировал базовые признаки персонажа...'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="reflections-footer">
          <button 
            type="button" 
            className={`ios-glass-btn copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            disabled={reflections.length === 0}
          >
            {copied ? 'Скопировано! ✓' : 'Скопировать'}
          </button>
        </footer>
      </div>
    </div>
  );
};
