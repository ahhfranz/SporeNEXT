import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const EmailSection = ({
  userEmail,
  newEmail,
  email, setEmail,
  showEmail, setShowEmail,
  isEditingEmail, setIsEditingEmail,
  hasEmailPassword,
  maskEmail,
  setIsSettingPassword,
  setErrorMsg,
  setSuccessMsg,
  setIsEditingPassword,
}) => {
  const { t } = useLanguage();

  return (
    <div className="settings-info-group">
      {hasEmailPassword ? (
        isEditingEmail ? (
          <div className="settings-info-details">
            <span className="settings-info-label">{t('settings.emailLabel')}</span>
            <div className="settings-input-wrapper">
              <input
                type="email"
                className="settings-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              <button
                type="button"
                className="settings-btn secondary"
                onClick={() => {
                  setIsEditingEmail(false);
                  setEmail(userEmail?.endsWith('@discord.sporenext.com') ? '' : (userEmail || ''));
                }}
              >
                {t('profile.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-info-row">
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.emailLabel')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="settings-info-value" style={{ color: userEmail?.endsWith('@discord.sporenext.com') ? 'var(--text-dim)' : '#fff' }}>
                  {userEmail?.endsWith('@discord.sporenext.com')
                    ? t('settings.emailNotLinked')
                    : (showEmail ? userEmail : maskEmail(userEmail))}
                </span>
                {!userEmail?.endsWith('@discord.sporenext.com') && (
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-hover, #9c7cf0)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: '0' }}
                  >
                    {showEmail ? t('settings.hideEmail') : t('settings.revealEmail')}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              className="settings-btn secondary"
              onClick={() => {
                setIsEditingEmail(true);
                if (setIsEditingPassword) setIsEditingPassword(false);
                setEmail(userEmail?.endsWith('@discord.sporenext.com') ? '' : (userEmail || ''));
              }}
            >
              {t('settings.editBtn')}
            </button>
          </div>
        )
      ) : (
        isEditingEmail ? (
          <div className="settings-info-details">
            <span className="settings-info-label">{t('settings.emailLabel')}</span>
            <p className="settings-item-desc" style={{ marginBottom: '4px' }}>
              {t('settings.linkEmailDesc')}
            </p>
            <input
              type="email"
              className="settings-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
        ) : (
          <div className="settings-info-row">
            <div className="settings-info-details">
              <span className="settings-info-label">{t('settings.emailLabel')}</span>
              <span className="settings-info-value" style={{ color: 'var(--text-dim)' }}>
                {t('settings.emailNotLinked')}
              </span>
            </div>
            <button
              type="button"
              className="settings-btn"
              onClick={() => {
                setIsEditingEmail(true);
                setIsSettingPassword(true);
                if (setIsEditingPassword) setIsEditingPassword(false);
                setEmail('');
                if (setErrorMsg) setErrorMsg('');
                if (setSuccessMsg) setSuccessMsg('');
              }}
            >
              {t('settings.linkEmailBtn')}
            </button>
          </div>
        )
      )}
      {newEmail && (
        <p className="settings-item-desc" style={{ marginTop: '6px', fontSize: '0.78rem', color: '#ff9f43', lineHeight: '1.4' }}>
          {t('settings.emailPendingConfirmation').replace('{email}', newEmail)}
        </p>
      )}
    </div>
  );
};

export default EmailSection;
