import React from 'react';

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
  return (
    <div className="reflections-screen">
      {/* Кнопка с крестиком сверху слева */}
      <header className="reflections-header">
        <button 
          type="button" 
          className="reflections-close-btn"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <img 
            src="/Cross.png" 
            alt="" 
            className="cross-icon-img"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <svg className="cross-svg-fallback" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h2 className="reflections-screen-title">РАЗМЫШЛЕНИЯ</h2>
      </header>

      {/* Скроллируемый список-таймлайн */}
      <div className="reflections-scroll-container">
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
                  {/* Левая колонка: кружок с номером и соединительная линия */}
                  <div className="timeline-left-col">
                    <div className="timeline-badge-circle">
                      {item.qunumber}
                    </div>
                    {!isLast && <div className="timeline-vertical-line" />}
                  </div>

                  {/* Правая колонка: Заголовок и текст мысли */}
                  <div className="timeline-right-col">
                    <h3 className="timeline-node-title">
                      Вопрос {item.qunumber}
                    </h3>
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
    </div>
  );
};
