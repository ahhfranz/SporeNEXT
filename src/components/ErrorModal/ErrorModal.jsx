import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import logoErrorImg from '../../assets/logo_error.png';
import './ErrorModal.css';

const ErrorModal = ({ isOpen, onClose, title, message }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-content-row">
          <div className="error-modal-logo-wrapper">
            <img src={logoErrorImg} alt={t('mods.errorLogoAlt')} className="error-modal-logo" />
          </div>
          <div className="error-modal-details">
            <h2 className="error-modal-title">SPORE NEXT</h2>
            <p className="error-modal-subtitle">{title || t('mods.errorTitle') || t('mods.errorDefaultTitle')}</p>
            <p className="error-modal-text">{message}</p>
            <div className="error-modal-buttons">
              <button className="error-modal-btn confirm" onClick={onClose}>
                {t('mods.errorClose')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ErrorModal;
