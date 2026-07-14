import { useState, useEffect, useCallback } from 'react';
import packageInfo from '../../package.json';

const defaultLauncherUpdate = {
  available: false,
  currentVersion: packageInfo.version,
  newVersion: '',
  state: 'idle',
  progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 },
  error: null
};

let globalLauncherUpdate = defaultLauncherUpdate;

export function useLauncherUpdate() {
  const [launcherUpdate, setLauncherUpdate] = useState(globalLauncherUpdate);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const updateState = useCallback((valOrFn) => {
    setLauncherUpdate(prev => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      globalLauncherUpdate = nextVal;
      return nextVal;
    });
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!isElectron || !window.electronAPI.checkForUpdates) return;

    updateState(prev => ({
      ...prev,
      state: 'checking',
      error: null
    }));

    try {
      await window.electronAPI.checkForUpdates();
    } catch (err) {
      console.error('Failed to trigger update check:', err);
      updateState(prev => ({
        ...prev,
        state: 'error',
        error: err.message || 'Error checking for updates'
      }));
    }
  }, [isElectron, updateState]);

  const downloadUpdate = useCallback(async () => {
    if (!isElectron || !window.electronAPI.downloadUpdate) return;

    updateState(prev => ({
      ...prev,
      state: 'downloading',
      error: null
    }));

    try {
      await window.electronAPI.downloadUpdate();
    } catch (err) {
      console.error('Failed to trigger update download:', err);
      updateState(prev => ({
        ...prev,
        state: 'error',
        error: err.message || 'Error downloading update'
      }));
    }
  }, [isElectron, updateState]);

  const installUpdate = useCallback(async () => {
    if (!isElectron || !window.electronAPI.installUpdate) return;

    try {
      await window.electronAPI.installUpdate();
    } catch (err) {
      console.error('Failed to trigger update installation:', err);
      updateState(prev => ({
        ...prev,
        state: 'error',
        error: err.message || 'Error installing update'
      }));
    }
  }, [isElectron, updateState]);

  useEffect(() => {
    if (!isElectron) return;

    const api = window.electronAPI;

    // listeners
    let unsubscribeChecking = () => { };
    let unsubscribeAvailable = () => { };
    let unsubscribeNotAvailable = () => { };
    let unsubscribeProgress = () => { };
    let unsubscribeDownloaded = () => { };
    let unsubscribeError = () => { };

    if (api.onUpdaterChecking) {
      unsubscribeChecking = api.onUpdaterChecking(() => {
        updateState(prev => ({
          ...prev,
          state: 'checking',
          error: null
        }));
      });
    }

    if (api.onUpdateAvailable) {
      unsubscribeAvailable = api.onUpdateAvailable((info) => {
        updateState(prev => ({
          ...prev,
          available: true,
          newVersion: info.version || 'Unknown',
          state: 'available',
          error: null
        }));
      });
    }

    if (api.onUpdateNotAvailable) {
      unsubscribeNotAvailable = api.onUpdateNotAvailable(() => {
        updateState(prev => ({
          ...prev,
          available: false,
          state: 'idle',
          error: null
        }));
      });
    }

    if (api.onUpdaterDownloadProgress) {
      unsubscribeProgress = api.onUpdaterDownloadProgress((progressInfo) => {
        updateState(prev => ({
          ...prev,
          state: 'downloading',
          progress: {
            percent: Math.round(progressInfo.percent || 0),
            bytesPerSecond: progressInfo.bytesPerSecond || 0,
            transferred: progressInfo.transferred || 0,
            total: progressInfo.total || 0
          },
          error: null
        }));
      });
    }

    if (api.onUpdateDownloaded) {
      unsubscribeDownloaded = api.onUpdateDownloaded((info) => {
        updateState(prev => ({
          ...prev,
          state: 'ready-to-install',
          newVersion: info.version || prev.newVersion,
          error: null
        }));
      });
    }

    if (api.onUpdaterError) {
      unsubscribeError = api.onUpdaterError((errorMsg) => {
        updateState(prev => ({
          ...prev,
          state: 'error',
          error: errorMsg || 'Unknown update error'
        }));
      });
    }

    let checkTimeout;
    if (globalLauncherUpdate.state === 'idle' || globalLauncherUpdate.state === 'error') {
      checkTimeout = setTimeout(() => {
        checkForUpdates();
      }, 2000);
    }

    return () => {
      if (checkTimeout) clearTimeout(checkTimeout);
      unsubscribeChecking();
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, [isElectron, checkForUpdates, updateState]);

  return {
    launcherUpdate,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  };
}
