import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import galaxyIcon from '../../assets/category_galaxyreset.png';
import loadingIcon from '../../assets/loading.png';
import './GalaxyResetModal.css';

const GalaxyResetModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { addNotification } = useNotification();

  const [folders, setFolders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [result, setResult] = useState(null);

  const loadFolders = useCallback(async () => {
    setLoadingList(true);
    setResult(null);
    try {
      const list = await window.electronAPI.galaxyListFolders();
      // sort games folder first then backups by number
      list.sort((a, b) => {
        if (a === 'Games') return -1;
        if (b === 'Games') return 1;
        return a.localeCompare(b);
      });
      setFolders(list);
      setSelected(null);
    } catch {
      setResult({ success: false, message: t('mods.galaxyListError') });
    } finally {
      setLoadingList(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => loadFolders());
    } else {
      Promise.resolve().then(() => {
        setFolders([]);
        setSelected(null);
        setResult(null);
        setSwapping(false);
      });
    }
  }, [isOpen, loadFolders]);

  const handleSwap = async () => {
    if (!selected) return;
    setSwapping(true);
    setResult(null);
    try {
      await window.electronAPI.galaxySwapFolder(selected);
      setResult({ success: true, message: t('mods.galaxySwapSuccess') });
      addNotification({
        type: 'galaxy_reset',
        titleKey: 'notifications.galaxy_reset',
        details: selected === 'Games' ? 'Games (Current)' : selected
      });
      await loadFolders();
    } catch {
      setResult({ success: false, message: t('mods.galaxySwapError') });
    } finally {
      setSwapping(false);
    }
  };

  const getFolderLabel = (name) => {
    if (name === 'Games') return t('mods.galaxyCurrentGames');
    return name; // ej: "Games.backup-1"
  };

  const getFolderAction = (name) => {
    if (name === 'Games') return t('mods.galaxyActionBackup');
    return t('mods.galaxyActionRestore');
  };

  // truncates the numeric suffix of backup names to max 4 digits
  // ej: "Games.backup-99999" > "Games.backup-9999.."
  const truncateName = (name, maxDigits = 4) => {
    const match = name.match(/^(Games\.backup-)(.+)$/);
    if (!match) return name;
    const suffix = match[2];
    if (suffix.length > maxDigits) {
      return `${match[1]}${suffix.slice(0, maxDigits)}..`;
    }
    return name;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="galaxy-modal-overlay" onClick={onClose}>
      <div className="galaxy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="galaxy-modal-header">
          <div className="galaxy-modal-icon-wrap">
            <img src={galaxyIcon} alt="Galaxy" className="galaxy-modal-icon" />
          </div>
          <div className="galaxy-modal-header-text">
            <h2 className="galaxy-modal-title">{t('mods.galaxyReset')}</h2>
            <p className="galaxy-modal-subtitle">{t('mods.galaxyModalSubtitle')}</p>
          </div>
        </div>

        <div className="galaxy-modal-divider" />

        <div className="galaxy-modal-body">
          {loadingList ? (
            <div className="galaxy-modal-loading">
              <img src={loadingIcon} alt="Loading" className="spin-icon" style={{ width: '20px', height: '20px' }} />
              <span>{t('loading')}</span>
            </div>
          ) : folders.length === 0 ? (
            <p className="galaxy-modal-empty">{t('mods.galaxyNoFolders')}</p>
          ) : (
            <ul className="galaxy-folder-list">
              {folders.map((name) => (
                <li
                  key={name}
                  className={`galaxy-folder-item ${selected === name ? 'selected' : ''} ${name === 'Games' ? 'current' : 'backup'}`}
                  onClick={() => setSelected(name)}
                >
                  <div className="galaxy-folder-info">
                    <span className="galaxy-folder-name">{getFolderLabel(name)}</span>
                    <span className="galaxy-folder-raw">{truncateName(name)}</span>
                  </div>
                  <span className="galaxy-folder-action-badge">{getFolderAction(name)}</span>
                </li>
              ))}
            </ul>
          )}

          {result && (
            <div className={`galaxy-result ${result.success ? 'success' : 'error'}`}>
              {result.message}
            </div>
          )}
        </div>

        <div className="galaxy-modal-divider" />

        <div className="galaxy-modal-footer">
          {selected && !loadingList && (
            <p className="galaxy-selected-hint">
              {selected === 'Games'
                ? t('mods.galaxyHintBackup')
                : t('mods.galaxyHintRestore').replace('{name}', truncateName(selected))}
            </p>
          )}
          <div className="galaxy-modal-buttons">
            <button className="galaxy-modal-btn cancel" onClick={onClose} disabled={swapping}>
              {t('mods.galaxyCancel')}
            </button>
            <button
              className="galaxy-modal-btn confirm"
              onClick={handleSwap}
              disabled={!selected || swapping || loadingList}
            >
              {swapping ? (
                <>
                  <img src={loadingIcon} alt="" className="spin-icon" style={{ width: '13px', height: '13px' }} />
                  <span>{t('mods.galaxySwapping')}</span>
                </>
              ) : (
                t('mods.galaxyConfirm')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GalaxyResetModal;
