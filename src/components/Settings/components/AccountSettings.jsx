import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import DeleteAccountModal from '../../DeleteAccountModal/DeleteAccountModal';
import UnlinkDiscordModal from './UnlinkDiscordModal';
import UnlinkGithubModal from './UnlinkGithubModal';
import { useAuth } from '../../../context/AuthContext';
import { useAccountSettings } from '../hooks/useAccountSettings';
import AccountProfileCard from './AccountProfileCard';
import EmailSection from './EmailSection';
import PasswordSection from './PasswordSection';
import ConnectedAccountsSection from './ConnectedAccountsSection';
import CredentialsConfirmForm from './CredentialsConfirmForm';
import DeleteAccountSection from './DeleteAccountSection';
import StatusBanners from './StatusBanners';

const AccountSettings = ({ accountInfoProp }) => {
  const { t } = useLanguage();
  const { isOffline } = useAuth();
  const defaultHookData = useAccountSettings();
  const s = accountInfoProp || defaultHookData;

  return (
    <div className="settings-sections-container">
      {/* account info */}
      <section id="account-info" className="settings-section-block">
        <h3 className="settings-section-title">{t('settings.accountInfo')}</h3>

        <AccountProfileCard
          avatarUrl={s.avatarUrl}
          displayName={s.displayName}
          profile={s.profile}
          role={s.role}
          isDiscordConnected={s.isDiscordConnected}
          isGithubConnected={s.isGithubConnected}
        />

        {isOffline ? (
          <div className="offline-account-settings-note">
            {t('settings.offlineAccountSettingsNote')}
          </div>
        ) : (
          <div className="settings-card-box">
            {/* username */}
            <div className="settings-info-row">
              <div className="settings-info-details">
                <span className="settings-info-label">{t('login.username')}</span>
                <span className="settings-info-value">
                  {s.profile?.username ? `@${s.profile.username}` : (s.user?.email ? s.user.email.split('@')[0] : t('topbar.defaultUser'))}
                </span>
              </div>
            </div>

            <div className="settings-row-divider" />

            {/* email */}
            <EmailSection
              userEmail={s.user?.email}
              newEmail={s.user?.new_email}
              email={s.email} setEmail={s.setEmail}
              showEmail={s.showEmail} setShowEmail={s.setShowEmail}
              isEditingEmail={s.isEditingEmail} setIsEditingEmail={s.setIsEditingEmail}
              hasEmailPassword={s.hasEmailPassword}
              maskEmail={s.maskEmail}
              setIsSettingPassword={s.setIsSettingPassword}
              setErrorMsg={s.setErrorMsg}
              setSuccessMsg={s.setSuccessMsg}
              setIsEditingPassword={s.setIsEditingPassword}
            />
          </div>
        )}
      </section>

      {!isOffline && (
        <>
          <div className="settings-section-divider" />

          {/* password and security */}
          <section id="password-security" className="settings-section-block">
            <h3 className="settings-section-title">{t('settings.passwordAndSecurity')}</h3>

            <div className="settings-card-box">
              <PasswordSection
                hasEmailPassword={s.hasEmailPassword}
                isEditingPassword={s.isEditingPassword} setIsEditingPassword={s.setIsEditingPassword}
                isSettingPassword={s.isSettingPassword} setIsSettingPassword={s.setIsSettingPassword}
                newPassword={s.newPassword} setNewPassword={s.setNewPassword}
                confirmPassword={s.confirmPassword} setConfirmPassword={s.setConfirmPassword}
                isSaving={s.isSaving}
                errorMsg={s.errorMsg} setErrorMsg={s.setErrorMsg}
                successMsg={s.successMsg} setSuccessMsg={s.setSuccessMsg}
                onCreatePassword={s.handleCreatePassword}
                setIsEditingEmail={s.setIsEditingEmail}
              />

              {/* confirm password form*/}
              {s.hasEmailPassword && (s.isEditingEmail || s.isEditingPassword) && (
                <CredentialsConfirmForm
                  currentPassword={s.currentPassword}
                  setCurrentPassword={s.setCurrentPassword}
                  isSaving={s.isSaving}
                  errorMsg={s.errorMsg}
                  successMsg={s.successMsg}
                  onSubmit={s.handleSaveCredentials}
                />
              )}

              {!s.isEditingEmail && !s.isEditingPassword && !s.isSettingPassword && (s.errorMsg || s.successMsg) && (
                <StatusBanners errorMsg={s.errorMsg} successMsg={s.successMsg} style={{ marginTop: '12px' }} />
              )}
            </div>
          </section>

          <div className="settings-section-divider" />

          {/* connected accs */}
          <section id="connected-accounts" className="settings-section-block">
            <h3 className="settings-section-title">{t('settings.connectedAccounts')}</h3>
            <ConnectedAccountsSection
              isDiscordConnected={s.isDiscordConnected}
              discordIdentity={s.discordIdentity}
              canUnlinkDiscord={s.canUnlinkDiscord}
              isGithubConnected={s.isGithubConnected}
              githubIdentity={s.githubIdentity}
              canUnlinkGithub={s.canUnlinkGithub}
              hasEmailPassword={s.hasEmailPassword}
              isSavingDiscord={s.isSavingDiscord}
              isSavingGithub={s.isSavingGithub}
              onLinkDiscord={s.handleLinkDiscord}
              onUnlinkDiscord={() => s.setShowUnlinkModal(true)}
              onLinkGithub={s.handleLinkGithub}
              onUnlinkGithub={() => s.setShowUnlinkGithubModal(true)}
              onGoToSetPassword={() => {
                s.setIsEditingEmail(true);
                s.setIsSettingPassword(true);
                s.setEmail('');
                s.setErrorMsg('');
                s.setSuccessMsg('');
              }}
            />
          </section>

          <div className="settings-section-divider" />

          {/* delete account */}
          <section id="delete-account" className="settings-section-block">
            <DeleteAccountSection onDeleteClick={() => s.setShowDeleteModal(true)} />
          </section>
        </>
      )}

      {/* modals */}
      <DeleteAccountModal
        isOpen={s.showDeleteModal}
        onClose={() => s.setShowDeleteModal(false)}
        onConfirm={s.deleteAccount}
        hasEmailPassword={s.hasEmailPassword}
        isSaving={s.isSaving}
      />

      <UnlinkDiscordModal
        isOpen={s.showUnlinkModal}
        onClose={() => s.setShowUnlinkModal(false)}
        onConfirm={() => {
          s.setShowUnlinkModal(false);
          s.handleUnlinkDiscord();
        }}
      />

      <UnlinkGithubModal
        isOpen={s.showUnlinkGithubModal}
        onClose={() => s.setShowUnlinkGithubModal(false)}
        onConfirm={() => {
          s.setShowUnlinkGithubModal(false);
          s.handleUnlinkGithub();
        }}
      />
    </div>
  );
};

export default AccountSettings;
