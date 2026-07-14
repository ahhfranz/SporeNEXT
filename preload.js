const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  close: () => ipcRenderer.send('window-close'),
  getSettings: () => ipcRenderer.invoke('get-app-settings'),
  updateSetting: (key, value) => ipcRenderer.invoke('update-app-setting', key, value),
  relaunch: () => ipcRenderer.send('relaunch-app'),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  detectGames: () => ipcRenderer.invoke('launcher-detect'),
  launchGame: (gameName) => ipcRenderer.invoke('launcher-run', gameName),
  killGame: () => ipcRenderer.invoke('launcher-kill'),
  checkGameRunning: () => ipcRenderer.invoke('launcher-status'),
  onDiscordLoginSuccess: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('discord-login-success', subscription);
    return () => {
      ipcRenderer.removeListener('discord-login-success', subscription);
    };
  },
  downloadMod: (modId, downloadInfo) => ipcRenderer.invoke('download-mod', modId, downloadInfo),
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    return () => {
      ipcRenderer.removeListener('download-progress', subscription);
    };
  },
  getDownloadedFiles: () => ipcRenderer.invoke('get-downloaded-files'),
  resolveGitHubAsset: (githubUrl, updatedAt) => ipcRenderer.invoke('resolve-github-asset', githubUrl, updatedAt),
  modListInstalled: () => ipcRenderer.invoke('mod-list-installed'),
  getModComponents: (filename) => ipcRenderer.invoke('get-mod-components', filename),
  modInstall: (filename, selectedIndices) => ipcRenderer.invoke('mod-install', filename, selectedIndices),
  modUninstall: (modName, modDetails) => ipcRenderer.invoke('mod-uninstall', modName, modDetails),
  modUpdate: (filename) => ipcRenderer.invoke('mod-update', filename),
  selectLocalModFile: () => ipcRenderer.invoke('select-local-mod-file'),
  getCacheSize: () => ipcRenderer.invoke('get-cache-size'),
  getCacheFiles: () => ipcRenderer.invoke('get-cache-files'),
  deleteCacheFile: (filename) => ipcRenderer.invoke('delete-cache-file', filename),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  galaxyListFolders: () => ipcRenderer.invoke('galaxy-list-folders'),
  galaxySwapFolder: (targetName) => ipcRenderer.invoke('galaxy-swap-folder', targetName),

  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  downloadUpdate: () => ipcRenderer.invoke('updater-download'),
  installUpdate: () => ipcRenderer.invoke('updater-install'),

  onUpdaterChecking: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('updater-checking', subscription);
    return () => {
      ipcRenderer.removeListener('updater-checking', subscription);
    };
  },
  onUpdateAvailable: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('updater-available', subscription);
    return () => {
      ipcRenderer.removeListener('updater-available', subscription);
    };
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('updater-not-available', subscription);
    return () => {
      ipcRenderer.removeListener('updater-not-available', subscription);
    };
  },
  onUpdaterError: (callback) => {
    const subscription = (event, error) => callback(error);
    ipcRenderer.on('updater-error', subscription);
    return () => {
      ipcRenderer.removeListener('updater-error', subscription);
    };
  },
  onUpdaterDownloadProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('updater-download-progress', subscription);
    return () => {
      ipcRenderer.removeListener('updater-download-progress', subscription);
    };
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('updater-downloaded', subscription);
    return () => {
      ipcRenderer.removeListener('updater-downloaded', subscription);
    };
  }
});
