import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import StatusBanners from './StatusBanners';

const CredentialsConfirmForm = ({
  currentPassword, setCurrentPassword,
  isSaving,
  errorMsg,
  successMsg,
  onSubmit,
}) => {
  const { t } = useLanguage();

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', marginTop: '12px' }}
    >
      <div className="settings-info-details">
        <span className="settings-info-label" style={{ color: '#ff9f43' }}>
          {t('settings.currentPasswordLabel')} *
        </span>
        <input
          type="password"
          className="settings-input"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder={t('settings.currentPasswordPlaceholder')}
          required
        />
      </div>

      <StatusBanners errorMsg={errorMsg} successMsg={successMsg} />

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button type="submit" className="settings-btn" disabled={isSaving}>
          {isSaving ? t('loading') : t('settings.saveCredentialsBtn')}
        </button>
      </div>
    </form>
  );
};

export default CredentialsConfirmForm;
