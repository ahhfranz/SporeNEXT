import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../context/LanguageContext';
import logoImg from '../../../assets/logo.png';
import './UnlinkGithubModal.css';

const UnlinkGithubModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div className="unlink-modal-overlay" onClick={onClose}>
      <div className="unlink-modal" onClick={(e) => e.stopPropagation()}>
        <div className="unlink-modal-content-row">
          <div className="unlink-modal-logo-wrapper">
            <img src={logoImg} alt="Spore NEXT Logo" className="unlink-modal-logo" />
          </div>
          <div className="unlink-modal-details">
            <h2 className="unlink-modal-title">SPORE NEXT</h2>
            <p className="unlink-modal-text">{t('settings.githubUnlinkConfirm')}</p>
            <div className="unlink-modal-buttons">
              <button className="unlink-modal-btn cancel" onClick={onClose}>
                {t('profile.cancel') || 'Cancel'}
              </button>
              <button className="unlink-modal-btn confirm" onClick={onConfirm}>
                {t('settings.unlinkGithubBtn') || 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UnlinkGithubModal;
