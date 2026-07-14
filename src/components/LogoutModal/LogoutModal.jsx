import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo.png';
import './LogoutModal.css';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div className="logout-modal-overlay" onClick={onClose}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-content-row">
          <div className="logout-modal-logo-wrapper">
            <img src={logoImg} alt="Spore NEXT Logo" className="logout-modal-logo" />
          </div>
          <div className="logout-modal-details">
            <h2 className="logout-modal-title">SPORE NEXT</h2>
            <p className="logout-modal-text">{t('sidebar.logoutConfirmMessage')}</p>
            <div className="logout-modal-buttons">
              <button className="logout-modal-btn cancel" onClick={onClose}>
                {t('sidebar.logoutCancel')}
              </button>
              <button className="logout-modal-btn confirm" onClick={onConfirm}>
                {t('sidebar.logoutConfirm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutModal;
