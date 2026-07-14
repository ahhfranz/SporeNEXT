import { useState, useEffect } from 'react';
import { useModData } from '../../ModList/hooks/useModData';
import { useNotification } from '../../../context/NotificationContext';

const IS_ELECTRON = typeof window !== 'undefined' && window.electronAPI !== undefined;

export function useAppSettings() {
  const { loadModsSilent, downloadProgresses } = useModData();
  const { addNotification } = useNotification();
  const isAnyModOperationInProgress = Object.values(downloadProgresses || {}).some(
    p => p.status === 'downloading' || p.status === 'installing' || p.status === 'uninstalling'
  );

  const [autoStart, setAutoStart] = useState(() => localStorage.getItem('spore_auto_start') === 'true');
  const [minimizeToTray, setMinimizeToTray] = useState(() => localStorage.getItem('spore_minimize_to_tray') === 'true');
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [showRestartModal, setShowRestartModal] = useState(false);

  useEffect(() => {
    if (!IS_ELECTRON) return;
    window.electronAPI.getSettings()
      .then(s => {
        if (!s) return;
        setAutoStart(s.autoStart);
        setMinimizeToTray(s.minimizeToTray);
        setHardwareAcceleration(s.hardwareAcceleration);
      })
      .catch(() => { });
  }, []);

  const handleToggleAutoStart = () => {
    const v = !autoStart;
    setAutoStart(v);
    localStorage.setItem('spore_auto_start', String(v));
    if (IS_ELECTRON) window.electronAPI.updateSetting('autoStart', v);
  };


  const handleToggleMinimizeToTray = () => {
    const v = !minimizeToTray;
    setMinimizeToTray(v);
    localStorage.setItem('spore_minimize_to_tray', String(v));
    if (IS_ELECTRON) window.electronAPI.updateSetting('minimizeToTray', v);
  };

  const handleToggleHardwareAcceleration = () => {
    const v = !hardwareAcceleration;
    setHardwareAcceleration(v);
    if (IS_ELECTRON) {
      window.electronAPI.updateSetting('hardwareAcceleration', v);
      setShowRestartModal(true);
    }
  };

  // cache settings
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheFiles, setCacheFiles] = useState([]);

  const loadCacheInfo = () => {
    if (!IS_ELECTRON) return;
    window.electronAPI.getCacheSize().then(setCacheSize).catch(() => { });
    window.electronAPI.getCacheFiles().then(setCacheFiles).catch(() => { });
  };

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const handleDeleteCacheFile = async (filename) => {
    if (!IS_ELECTRON || isAnyModOperationInProgress) return;
    try {
      await window.electronAPI.deleteCacheFile(filename);
      loadCacheInfo();
      if (loadModsSilent) loadModsSilent();
    } catch (err) {
    }
  };

  const handleClearCache = async () => {
    if (!IS_ELECTRON || isAnyModOperationInProgress) return;
    try {
      await window.electronAPI.clearCache();
      loadCacheInfo();
      if (loadModsSilent) loadModsSilent();
      addNotification({
        type: 'cache_cleared',
        titleKey: 'notifications.cache_cleared',
        details: ''
      });
    } catch (err) {
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    isElectron: IS_ELECTRON,
    // state
    autoStart,
    minimizeToTray,
    hardwareAcceleration,
    showRestartModal,
    setShowRestartModal,
    cacheSize: formatBytes(cacheSize),
    cacheFiles,
    isAnyModOperationInProgress,
    // handlers
    handleToggleAutoStart,
    handleToggleMinimizeToTray,
    handleToggleHardwareAcceleration,
    handleDeleteCacheFile,
    handleClearCache,
    refreshCache: loadCacheInfo
  };
}
