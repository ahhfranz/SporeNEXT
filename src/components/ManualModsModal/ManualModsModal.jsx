import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Trash2, FileText, RefreshCw, Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { useModData } from '../ModList/hooks/useModData';
import loadingIcon from '../../assets/loading.png';
import logoImg from '../../assets/logo.png';
import './ManualModsModal.css';
import { getNormalizedBase } from '../../utils/modHelper';

// function to check if an installed mod matches any database mod
const matchesOnlineDb = (installedMod, onlineMods) => {
  if (!installedMod || !onlineMods || onlineMods.length === 0) return false;

  const mNameLower = (installedMod.name || '').toLowerCase().trim();
  const mUniqueLower = (installedMod.uniqueName || '').toLowerCase().trim();
  const mNameNorm = getNormalizedBase(installedMod.name);
  const mUniqueNorm = getNormalizedBase(installedMod.uniqueName);

  const mFileNorms = new Set();
  if (installedMod.files) {
    installedMod.files.forEach(f => {
      const norm = getNormalizedBase(f);
      if (norm) mFileNorms.add(norm);
    });
  }

  return onlineMods.some(dbMod => {
    const dbNameLower = (dbMod.name || '').toLowerCase().trim();
    const dbUniqueLower = (dbMod.uniqueName || dbMod.unique || '').toLowerCase().trim();

    if (dbNameLower && dbNameLower === mNameLower) return true;
    if (dbUniqueLower && dbUniqueLower === mUniqueLower) return true;

    const dbNameNorm = getNormalizedBase(dbMod.name);
    const dbUniqueNorm = getNormalizedBase(dbMod.uniqueName || dbMod.unique);

    if (dbNameNorm && (dbNameNorm === mNameNorm || dbNameNorm === mUniqueNorm)) return true;
    if (dbUniqueNorm && (dbUniqueNorm === mNameNorm || dbUniqueNorm === mUniqueNorm)) return true;

    const dbTargetBases = new Set();
    if (dbNameNorm) dbTargetBases.add(dbNameNorm);
    if (dbUniqueNorm) dbTargetBases.add(dbUniqueNorm);

    if (dbMod.filename) {
      const fnNorm = getNormalizedBase(dbMod.filename);
      if (fnNorm) dbTargetBases.add(fnNorm);
    } else if (dbMod.download_url) {
      const filePart = dbMod.download_url.split('?')[0].split('/').pop();
      if (filePart) {
        const urlNorm = getNormalizedBase(filePart);
        if (urlNorm) dbTargetBases.add(urlNorm);
      }
    }
    if (dbMod.github) {
      const parts = dbMod.github.split('/');
      const repoName = parts[parts.length - 1];
      if (repoName) {
        const repoNorm = getNormalizedBase(repoName);
        if (repoNorm) dbTargetBases.add(repoNorm);
      }
    }

    if (mNameNorm && dbTargetBases.has(mNameNorm)) return true;
    if (mUniqueNorm && dbTargetBases.has(mUniqueNorm)) return true;

    if (mFileNorms.size > 0) {
      for (const fNorm of mFileNorms) {
        if (dbTargetBases.has(fNorm)) return true;
      }
    }

    return false;
  });
};

const ManualModsModal = ({ isOpen, onClose, dbMods, onOpenComponents }) => {
  const { t } = useLanguage();
  const { addNotification } = useNotification();
  const { loadModsSilent } = useModData();

  const [manualMods, setManualMods] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '' });

  const displayedMods = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return manualMods;
    return manualMods.filter(mod => {
      const modName = (mod.name || '').toLowerCase();
      const cleanModName = modName.replace(/^!+/, '');
      const modDesc = (mod.description || '').toLowerCase();
      const matchesFile = mod.files && mod.files.some(f => f.toLowerCase().includes(q));
      return modName.includes(q) || cleanModName.includes(q) || modDesc.includes(q) || matchesFile;
    });
  }, [manualMods, searchQuery]);

  const fetchManualMods = useCallback(async () => {
    setLoading(true);
    try {
      const installed = await window.electronAPI.modListInstalled();

      const filtered = installed.filter(m => {
        if (m.uniqueName === '4gb-patch' || m.uniqueName === '60fps-patch') return false;
        if (matchesOnlineDb(m, dbMods)) return false;
        return true;
      });

      setManualMods(filtered);
    } catch (err) {
      console.error('Failed to load manual mods:', err);
    } finally {
      setLoading(false);
    }
  }, [dbMods]);

  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setTimeout(() => setSearchQuery(''), 0);
      fetchManualMods();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, fetchManualMods]);

  const processInstalledDiff = (beforeList, afterList, defaultName) => {
    const newMods = afterList.filter(a => !beforeList.some(b => b.name === a.name || b.uniqueName === a.uniqueName));
    const newMod = newMods[0];
    const installedName = newMod ? newMod.name : defaultName;

    if (newMod) {
      if (matchesOnlineDb(newMod, dbMods)) {
        setInfoDialog({
          isOpen: true,
          title: t('mods.manualModsTitle'),
          message: t('mods.manualInstallDbDetails').replace('{name}', installedName)
        });
        return;
      }
    }

    addNotification({
      type: 'manual_install_success',
      titleKey: 'mods.manualInstallSuccess',
      details: installedName
    });
  };

  const handleInstallLocal = async () => {
    if (actionLoading) return;
    try {
      const filePath = await window.electronAPI.selectLocalModFile();
      if (!filePath) return;

      setActionLoading(true);
      setLoadingText(t('mods.manualInstalling') || 'Installing local mod...');

      const beforeList = await window.electronAPI.modListInstalled();
      const defaultName = filePath.split(/[\\/]/).pop();

      const componentsInfo = await window.electronAPI.getModComponents(filePath);

      if (componentsInfo && componentsInfo.hasComponents && Array.isArray(componentsInfo.groups) && componentsInfo.groups.length > 0) {
        setActionLoading(false);
        onOpenComponents(filePath, componentsInfo, async (res) => {
          if (res && res.output === 'Already installed') {
            setInfoDialog({
              isOpen: true,
              title: t('mods.manualModsTitle'),
              message: t('mods.manualAlreadyInstalledDetails').replace('{name}', defaultName)
            });
            return;
          }
          const afterList = await window.electronAPI.modListInstalled();
          processInstalledDiff(beforeList, afterList, defaultName);
          await fetchManualMods();
          if (loadModsSilent) loadModsSilent();
        });
      } else {
        const res = await window.electronAPI.modInstall(filePath);
        if (res && res.success) {
          if (res.output === 'Already installed') {
            setInfoDialog({
              isOpen: true,
              title: t('mods.manualModsTitle'),
              message: t('mods.manualAlreadyInstalledDetails').replace('{name}', defaultName)
            });
            return;
          }
          const afterList = await window.electronAPI.modListInstalled();
          processInstalledDiff(beforeList, afterList, defaultName);
          await fetchManualMods();
          if (loadModsSilent) loadModsSilent();
        } else {
          throw new Error((res && res.error) || 'Installation failed.');
        }
      }
    } catch (err) {
      console.error('Failed to install local mod:', err);
      setInfoDialog({
        isOpen: true,
        title: t('mods.manualModsTitle'),
        message: err.message || 'Failed to install local mod file.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUninstall = async (mod) => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setLoadingText(t('mods.uninstallingMod') || 'Uninstalling mod...');

      const res = await window.electronAPI.modUninstall(mod.name, {
        index: mod.index,
        name: mod.name,
        uniqueName: mod.uniqueName,
        files: mod.files
      });

      if (res && res.success) {
        addNotification({
          type: 'manual_uninstall_success',
          titleKey: 'mods.manualUninstallSuccess',
          details: mod.name
        });
        await fetchManualMods();
        if (loadModsSilent) loadModsSilent();
      } else {
        throw new Error((res && res.error) || 'Uninstall failed.');
      }
    } catch (err) {
      console.error('Failed to uninstall manual mod:', err);
      setInfoDialog({
        isOpen: true,
        title: t('mods.manualModsTitle'),
        message: err.message || 'Failed to uninstall manual mod.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="manual-modal-overlay" onClick={onClose}>
      <div className="manual-modal" onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="manual-modal-header">
          <div className="manual-modal-icon-wrap">
            <img src={logoImg} alt="Logo" className="manual-modal-icon" />
          </div>
          <div className="manual-modal-header-text">
            <h2 className="manual-modal-title">{t('mods.manualModsTitle')}</h2>
            <p className="manual-modal-subtitle">{t('mods.manualModsSub')}</p>
          </div>
          <button className="manual-modal-close-btn" onClick={onClose} data-tooltip={t('onboarding.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="manual-modal-divider" />

        {/*  tooolbar */}
        <div className="manual-modal-toolbar">
          <button
            className="manual-refresh-btn"
            onClick={fetchManualMods}
            data-tooltip={t('mods.manualRefresh') || 'Refresh mods list'}
            disabled={actionLoading || loading}
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          </button>

          <button
            className="manual-install-btn"
            onClick={handleInstallLocal}
            disabled={actionLoading || loading}
          >
            <FolderPlus size={16} />
            <span>{t('mods.manualInstallBtn')}</span>
          </button>

          <div className="manual-search-wrapper glass">
            <Search className="manual-search-icon" size={14} />
            <input
              type="text"
              className="manual-search-input"
              placeholder={t('mods.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="manual-search-clear" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* body */}
        <div className="manual-modal-body">
          {actionLoading ? (
            <div className="manual-modal-status-screen">
              <img src={loadingIcon} alt="Loading" className="spin-icon" style={{ width: '32px', height: '32px' }} />
              <p className="manual-status-text">{loadingText}</p>
            </div>
          ) : loading ? (
            <div className="manual-modal-status-screen">
              <img src={loadingIcon} alt="Loading" className="spin-icon" style={{ width: '24px', height: '24px' }} />
              <p>{t('loading')}</p>
            </div>
          ) : manualMods.length === 0 ? (
            <div className="manual-modal-empty">
              <img src={loadingIcon} alt="Empty" style={{ width: '32px', height: '32px' }} />
              <p>{t('mods.manualNoMods')}</p>
            </div>
          ) : displayedMods.length === 0 ? (
            <div className="manual-modal-empty">
              <img src={loadingIcon} alt="Empty" style={{ width: '32px', height: '32px' }} />
              <p>{t('mods.noResults') || 'No mods matching your filters were found.'}</p>
            </div>
          ) : (
            <div className="manual-table-container">
              <table className="manual-table">
                <thead>
                  <tr>
                    <th>{t('mods.manualTableName')}</th>
                    <th>{t('mods.manualTableDesc')}</th>
                    <th>{t('mods.manualTableFiles')}</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>{t('mods.manualTableActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMods.map((mod) => (
                    <tr key={mod.index}>
                      <td className="manual-mod-name-cell">
                        <div className="manual-mod-name-wrap">
                          <span className="manual-mod-title">{mod.name}</span>
                          <span className="manual-mod-author">{t('mods.manualDefaultAuthor')}</span>
                        </div>
                      </td>
                      <td className="manual-mod-desc-cell">
                        <p className="manual-mod-description">
                          {mod.description || t('mods.manualDefaultDesc')}
                        </p>
                      </td>
                      <td className="manual-mod-files-cell">
                        <div className="manual-files-list">
                          {mod.files && mod.files.map((file, idx) => (
                            <span key={idx} className="manual-file-tag" data-tooltip={file}>
                              <FileText size={10} style={{ flexShrink: 0 }} />
                              <span className="manual-file-tag-text">{file}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="manual-mod-action-cell">
                        <button
                          className="manual-uninstall-btn"
                          onClick={() => handleUninstall(mod)}
                          data-tooltip={t('mods.manualUninstall')}
                        >
                          <Trash2 size={14} />
                          <span>{t('mods.manualUninstall')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {infoDialog.isOpen && (
          <div className="manual-info-overlay">
            <div className="manual-info-card">
              <div className="manual-info-content-row">
                <div className="manual-info-logo-wrapper">
                  <img src={logoImg} alt="Spore NEXT Logo" className="manual-info-logo" />
                </div>
                <div className="manual-info-details">
                  <h2 className="manual-info-title">{infoDialog.title}</h2>
                  <p className="manual-info-message">{infoDialog.message}</p>
                  <div className="manual-info-buttons">
                    <button className="manual-info-confirm-btn" onClick={() => setInfoDialog({ isOpen: false, title: '', message: '' })}>
                      {t('mods.errorClose') || 'OK'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ManualModsModal;
