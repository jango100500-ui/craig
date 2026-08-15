import React, { useState } from 'react';
import { AVAILABLE_MODELS, getSelectedModelId, setSelectedModelId } from '../services/gemini';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const [selectedId, setSelectedId] = useState(getSelectedModelId());
  const [isOpenList, setIsOpenList] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
    }, 220);
  };

  return (
    <div className={`settings-screen-overlay ${isClosing ? 'closing' : ''}`}>
      <div className="settings-container">
        <header className="settings-header">
          <h2 className="settings-title">НАСТРОЙКИ</h2>

          <button 
            type="button" 
            className="settings-close-round-btn"
            onClick={handleClose}
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
        </header>

        <div className="settings-section">
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
            Выберите приоритетную модель. При исчерпании квоты Крегг автоматически продолжит игру на других моделях семейства 3.x.
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
      </div>
    </div>
  );
};
