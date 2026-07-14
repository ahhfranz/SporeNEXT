import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import LanguageSelect from '../../LanguageSelect/LanguageSelect';
import RestartModal from '../../RestartModal/RestartModal';
import SettingsToggleItem from './SettingsToggleItem';
import { useAppSettings } from '../hooks/useAppSettings';
import logoImg from '../../../assets/logo.png';
import '../../LogoutModal/LogoutModal.css';

const AppSettings = () => {
  const { t } = useLanguage();
  const s = useAppSettings();
  const [showFileList, setShowFileList] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => { },
  });

  const toggles = [
    {
      label: t('settings.autoStart'),
      desc: t('settings.autoStartDesc'),
      checked: s.autoStart,
      onChange: s.handleToggleAutoStart,
    },
    {
      label: t('settings.minimizeToTray'),
      desc: t('settings.minimizeToTrayDesc'),
      checked: s.minimizeToTray,
      onChange: s.handleToggleMinimizeToTray,
    },
    {
      label: t('settings.hardwareAcceleration'),
      desc: t('settings.hardwareAccelerationDesc'),
      checked: s.hardwareAcceleration,
      onChange: s.handleToggleHardwareAcceleration,
      disabled: !s.isElectron,
    },
  ];

  return (
    <div className="settings-sections-container">
      {/* app preferences */}
      <section id="app-preferences" className="settings-section-block">
        <h3 className="settings-section-title">{t('settings.preferences')}</h3>

        <div className="settings-card-box">
          <div className="settings-language-select-wrapper">
            <LanguageSelect />
          </div>

          <div className="settings-toggles-list">
            {toggles.map(item => (
              <SettingsToggleItem
                key={item.label}
                label={item.label}
                description={item.desc}
                checked={item.checked}
                onChange={item.onChange}
                disabled={item.disabled}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="settings-section-divider" />

      {/* cache section */}
      <section id="app-cache" className="settings-section-block">
        <h3 className="settings-section-title">{t('settings.cacheTitle')}</h3>

        <div className="settings-card-box">
          <div className="cache-summary-row">
            <div className="cache-size-info">
              <span className="cache-size-label">{t('settings.cacheSize')}</span>
              <span className="cache-size-value">{s.cacheSize}</span>
            </div>
            <div className="cache-actions">
              {s.cacheFiles.length > 0 && (
                <button
                  className="cache-toggle-details-btn"
                  onClick={() => setShowFileList(!showFileList)}
                  data-tooltip={showFileList ? t('settings.hideFileList') : t('settings.showFileList')}
                >
                  <span>{s.cacheFiles.length} {s.cacheFiles.length === 1 ? t('settings.cacheFileSingle') : t('settings.cacheFilePlural')}</span>
                  {showFileList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
              {s.cacheFiles.length > 0 && (
                <button
                  className="settings-btn danger"
                  disabled={s.isAnyModOperationInProgress}
                  data-tooltip={
                    s.isAnyModOperationInProgress
                      ? t('mods.cannotDeleteCacheDuringOp')
                      : undefined
                  }
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: t('settings.cacheTitle'),
                      message: t('settings.confirmClearCache'),
                      confirmText: t('settings.clearCacheBtn'),
                      cancelText: t('settings.restartCancelBtn'),
                      onConfirm: () => {
                        s.handleClearCache();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      }
                    });
                  }}
                >
                  {t('settings.clearCacheBtn')}
                </button>
              )}
            </div>
          </div>

          {showFileList && s.cacheFiles.length > 0 && (
            <div className="cache-files-list animate-tab">
              {s.cacheFiles.map(file => (
                <div key={file.name} className="cache-file-item">
                  <div className="cache-file-details">
                    <span className="cache-file-name" data-tooltip={file.name}>{file.name}</span>
                    <span className="cache-file-size">{file.sizeFormatted}</span>
                  </div>
                  <button
                    className="cache-file-delete-btn"
                    disabled={s.isAnyModOperationInProgress}
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: t('settings.cacheTitle'),
                        message: t('settings.confirmDeleteCacheFile').replace('{filename}', file.name),
                        confirmText: t('settings.deleteCacheFile'),
                        cancelText: t('settings.restartCancelBtn'),
                        onConfirm: () => {
                          s.handleDeleteCacheFile(file.name);
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                    }}
                    data-tooltip={
                      s.isAnyModOperationInProgress
                        ? t('mods.cannotDeleteCacheDuringOp')
                        : t('settings.deleteCacheFile')
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {s.cacheFiles.length === 0 && (
            <div className="cache-empty-text">{t('settings.cacheEmpty')}</div>
          )}
        </div>
      </section>

      <RestartModal
        isOpen={s.showRestartModal}
        onClose={() => s.setShowRestartModal(false)}
        onConfirm={() => window.electronAPI.relaunch()}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="logout-modal-overlay" onClick={onClose}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-content-row">
          <div className="logout-modal-logo-wrapper">
            <img src={logoImg} alt="Spore NEXT Logo" className="logout-modal-logo" />
          </div>
          <div className="logout-modal-details">
            <h2 className="logout-modal-title">{title}</h2>
            <p className="logout-modal-text">{message}</p>
            <div className="logout-modal-buttons">
              <button className="logout-modal-btn cancel" onClick={onClose}>
                {cancelText}
              </button>
              <button className="logout-modal-btn confirm" onClick={onConfirm}>
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AppSettings;
