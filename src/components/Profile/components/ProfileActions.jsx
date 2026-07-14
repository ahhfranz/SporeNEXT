import React from 'react';
import { Edit3, Settings, Save, X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import './ProfileActions.css';

const ProfileActions = ({
  isViewingOthers,
  isGloballyEditing,
  isSaving,
  onBack,
  onCancel,
  onSave,
  onStartEdit,
  onGoToSettings,
}) => {
  const { t } = useLanguage();
  const { isOffline, isNetworkOnline } = useAuth();

  const isActionsDisabled = isOffline || !isNetworkOnline;

  if (isViewingOthers) {
    return (
      <div className="profile-actions">
        <button className="btn btn-secondary glass" onClick={onBack} data-tooltip={t('profile.backToMyProfile')}>
          <ArrowLeft size={18} />
        </button>
      </div>
    );
  }

  if (isGloballyEditing) {
    return (
      <div className="profile-actions">
        <button className="btn btn-secondary glass" onClick={onCancel} disabled={isSaving} data-tooltip={t('profile.cancel')}>
          <X size={18} />
        </button>
        <button className="btn btn-primary" onClick={onSave} disabled={isSaving || isActionsDisabled} data-tooltip={t('profile.saveChanges')}>
          <Save size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="profile-actions">
      <button className="btn btn-secondary glass" onClick={onGoToSettings} data-tooltip={t('profile.settings')}>
        <Settings size={18} />
      </button>
      <button
        className="btn btn-primary"
        onClick={onStartEdit}
        disabled={isActionsDisabled}
        data-tooltip={isActionsDisabled ? (isOffline ? t('mods.loginToLike') : t('mods.offlineActionError')) : t('profile.edit')}
      >
        <Edit3 size={18} />
      </button>
    </div>
  );
};

export default ProfileActions;
