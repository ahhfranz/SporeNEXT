import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import loadingIcon from '../../assets/loading.png';
import logoErrorIcon from '../../assets/logo_delete.png';
import './DeleteAccountModal.css';

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, hasEmailPassword, isSaving }) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (hasEmailPassword && !password) {
      setErrorMsg(t('login.fillAllFields') || 'Please enter your password.');
      return;
    }

    try {
      await onConfirm(password);
      setPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during account deletion.');
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setPassword('');
    setErrorMsg('');
    onClose();
  };

  return createPortal(
    <div className="delete-modal-overlay" onClick={handleClose}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <img src={logoErrorIcon} alt="Error" className="delete-modal-icon" />
          <h3>{t('settings.deleteAccountTitle')}</h3>
        </div>
        <p className="delete-confirm-text">{t('settings.deleteAccountConfirmText')}</p>

        <form onSubmit={handleSubmit} className="delete-modal-form">
          {hasEmailPassword && (
            <div className="delete-password-section">
              <label className="delete-password-label">
                {t('settings.deleteAccountPasswordPrompt')}
              </label>
              <input
                type="password"
                className="delete-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('settings.currentPasswordPlaceholder') || "Enter password..."}
                disabled={isSaving}
                autoFocus
              />
            </div>
          )}

          {errorMsg && (
            <div className="delete-error-banner">
              {errorMsg}
            </div>
          )}

          <div className="delete-modal-buttons">
            <button
              type="button"
              className="delete-modal-btn cancel"
              onClick={handleClose}
              disabled={isSaving}
            >
              {t('profile.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="delete-modal-btn confirm"
              disabled={isSaving}
            >
              {isSaving ? (
                <img src={loadingIcon} alt="Loading..." className="spinner-icon spin-icon" style={{ width: '14px', height: '14px' }} />
              ) : (
                t('settings.deleteAccountBtn')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default DeleteAccountModal;
