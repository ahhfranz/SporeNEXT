import React from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * this is the delete account row at the bottom of account settings
 */
const DeleteAccountSection = ({ onDeleteClick }) => {
  const { t } = useLanguage();

  return (
    <div className="settings-item" style={{ marginTop: '16px', borderBottom: 'none' }}>
      <div className="settings-item-info">
        <span className="settings-item-label" style={{ color: '#ff4757' }}>{t('settings.deleteAccountBtn')}</span>
        <span className="settings-item-desc">{t('settings.deleteAccountDesc')}</span>
      </div>
      <button className="settings-btn danger" onClick={onDeleteClick}>
        <Trash2 size={16} />
        <span>{t('settings.deleteAccountBtn')}</span>
      </button>
    </div>
  );
};

export default DeleteAccountSection;
