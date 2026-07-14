import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import './RestartModal.css';

const RestartModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div className="restart-modal-overlay" onClick={onClose}>
      <div className="restart-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('settings.hardwareAcceleration')}</h3>
        <p className="restart-modal-text">{t('settings.restartConfirm')}</p>
        <div className="restart-modal-buttons">
          <button className="restart-modal-btn cancel" onClick={onClose}>
            {t('settings.restartCancelBtn')}
          </button>
          <button className="restart-modal-btn confirm" onClick={onConfirm}>
            {t('settings.restartConfirmBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RestartModal;
