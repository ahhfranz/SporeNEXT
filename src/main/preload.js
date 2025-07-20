const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    closeWindow: () => ipcRenderer.invoke('close-window'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    openModsFolder: () => ipcRenderer.invoke('open-mods-folder'),
    openDiscord: () => ipcRenderer.invoke('open-discord'),
    installMod: (modFile, target) => ipcRenderer.invoke('install-mod', modFile, target),
    onModInstallProgress: (callback) => ipcRenderer.on('mod-install-progress', (event, percent) => callback(percent)),
    detectSporePath: () => ipcRenderer.invoke('detect-spore-path'),
    detectGAPPath: () => ipcRenderer.invoke('detect-ga-path'),
    setSporePath: (path) => ipcRenderer.invoke('set-spore-path', path),
    setGAPath: (path) => ipcRenderer.invoke('set-ga-path', path),
    checkSporePath: (folderPath, type) => ipcRenderer.invoke('check-spore-path', folderPath, type),
    browseFolder: () => ipcRenderer.invoke('browse-folder'),
    removeModInstallProgressListeners: () => ipcRenderer.removeAllListeners('mod-install-progress'),
    launchSpore: () => ipcRenderer.invoke('launch-spore'),
    launchGA: () => ipcRenderer.invoke('launch-ga'),
    uninstallAllMods: () => ipcRenderer.invoke('uninstall-all-mods'),
    updateLauncher: () => ipcRenderer.send('quit-and-install'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
});