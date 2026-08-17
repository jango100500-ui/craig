import React, { useState } from 'react';
import { AVAILABLE_MODELS, getSelectedModelId, setSelectedModelId, getEnergyPercent } from '../services/gemini';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const [selectedId, setSelectedId] = useState(getSelectedModelId());
  const [isOpenList, setIsOpenList] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const energyPercent = getEnergyPercent();
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedId) || AVAILABLE_MODELS[0];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSelectedModelId(id);
    setIsOpenList(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  return (
    <div className={`settings-screen-overlay ${isClosing ? 'closing' : ''}`}>
      {/* Кнопка закрытия зафиксирована в правом верхнем углу */}
      <button 
        type="button" 
        className="settings-fixed-close-btn"
        onClick={handleClose}
        aria-label="Закрыть"
      >
        <img src="/Cross.png" alt="Закрыть" className="cross-icon-img" />
      </button>

      <div className="settings-container">
        <header className="settings-header">
          <h2 className="settings-title">Настройки</h2>
        </header>

        <div className="settings-section">
          {/* 1. ПРИОРИТЕТ: ВЫБОР МОДЕЛИ НАВЕРХУ */}
          <div className="model-select-wrapper">
            <button 
              type="button"
              className={`model-capsule-btn ${isOpenList ? 'active' : ''}`}
              onClick={() => setIsOpenList(!isOpenList)}
            >
              <div className="model-capsule-left">
                <span className="model-name">{currentModel.name}</span>
                {currentModel.tag && (
                  <span className="model-tag-badge">{currentModel.tag}</span>
                )}
              </div>

              <div className={`model-capsule-arrow ${isOpenList ? 'open' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            <p className="settings-caption">
              При исчерпании дневной квоты выбранной модели игра автоматически продолжится на резервной.
            </p>

            {isOpenList && (
              <div className="models-dropdown-list">
                {AVAILABLE_MODELS.map((model) => {
                  const isSelected = model.id === selectedId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      className={`model-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(model.id)}
                    >
                      <div className="model-option-info">
                        <span className="model-option-name">{model.name}</span>
                        {model.tag && (
                          <span className="model-tag-badge">{model.tag}</span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="model-checkmark">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. ПОЛОСКА ЛИМИТОВ СНИЗУ: СТЕКЛЯННАЯ ПЛАШКА БЕЗ СВЕЧЕНИЙ */}
          <div className="energy-card">
            <div className="energy-flask-track">
              <div 
                className="energy-flask-fill" 
                style={{ width: `${energyPercent}%` }} 
              />
              <span className="energy-percentage-label">{energyPercent}%</span>
            </div>

            <p className="energy-caption-text">
              Запас сил Крегга на сегодня. Тяжелые модели расходуют ресурс быстрее, а легкие позволяют провести больше партий. Лимит обновляется раз в сутки.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
