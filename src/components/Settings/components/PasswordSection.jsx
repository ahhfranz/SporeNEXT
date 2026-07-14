import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import StatusBanners from './StatusBanners';

const PasswordSection = ({
  hasEmailPassword,
  isEditingPassword, setIsEditingPassword,
  isSettingPassword, setIsSettingPassword,
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  isSaving,
  errorMsg, setErrorMsg,
  successMsg, setSuccessMsg,
  onCreatePassword,
  setIsEditingEmail,
}) => {
  const { t } = useLanguage();

  return (
    <div className="settings-info-group">
      {hasEmailPassword ? (
        isEditingPassword ? (
          <div className="settings-info-details" style={{ gap: '12px' }}>
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.newPassword')}</span>
              <input
                type="password"
                className="settings-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('settings.newPasswordPlaceholder')}
              />
            </div>
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.confirmNewPassword')}</span>
              <input
                type="password"
                className="settings-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                className="settings-btn secondary"
                onClick={() => { setIsEditingPassword(false); setNewPassword(''); setConfirmPassword(''); }}
              >
                {t('profile.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-info-row">
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.changePassword')}</span>
              <span className="settings-info-value" style={{ letterSpacing: '2px', color: 'var(--text-dim)' }}>
                ••••••••
              </span>
            </div>
            <button
              type="button"
              className="settings-btn secondary"
              onClick={() => {
                setIsEditingPassword(true);
                if (setIsEditingEmail) setIsEditingEmail(false);
              }}
            >
              {t('settings.changePasswordBtn')}
            </button>
          </div>
        )
      ) : (
        isSettingPassword ? (
          <form onSubmit={onCreatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="settings-info-label">{t('settings.setPasswordTitle')}</span>
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.newPassword')}</span>
              <input
                type="password"
                className="settings-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.confirmNewPassword')}</span>
              <input
                type="password"
                className="settings-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <StatusBanners errorMsg={errorMsg} successMsg={successMsg} />

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="settings-btn secondary"
                disabled={isSaving}
                onClick={() => {
                  setIsSettingPassword(false);
                  if (setIsEditingEmail) setIsEditingEmail(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                {t('profile.cancel')}
              </button>
              <button type="submit" className="settings-btn" disabled={isSaving}>
                {isSaving ? t('loading') : t('settings.linkEmailBtn')}
              </button>
            </div>
          </form>
        ) : (
          <div className="settings-info-row">
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.changePassword')}</span>
              <span className="settings-info-value" style={{ color: 'var(--text-dim)' }}>
                {t('settings.noPasswordSet')}
              </span>
            </div>
            <button
              type="button"
              className="settings-btn secondary"
              onClick={() => {
                setIsSettingPassword(true);
                if (setIsEditingEmail) setIsEditingEmail(false);
              }}
            >
              {t('settings.setPasswordTitle')}
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default PasswordSection;
