const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ==========================
    // Window Controls & External Links
    // ==========================
    closeWindow: () => ipcRenderer.invoke('close-window'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    openModsFolder: () => ipcRenderer.invoke('open-mods-folder'),
    openDiscord: () => ipcRenderer.invoke('open-discord'),
    openKofi: () => ipcRenderer.invoke('open-kofi'),

    // ==========================
    // App Version & Updates
    // ==========================
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    updateLauncher: () => ipcRenderer.send('quit-and-install'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),

    // ==========================
    // Language & Translations
    // ==========================
    setLanguage: (lang) => ipcRenderer.invoke('set-language', lang),
    showConfirm: (options) => ipcRenderer.invoke('show-confirm', options),

    // ==========================
    // Window State Events
    // ==========================
    onWindowFocused: (callback) => ipcRenderer.on('window-focused', callback),
    onWindowMaximizeChanged: (callback) => ipcRenderer.on('window-maximize-changed', callback),

    // ==========================
    // Spore Installations
    // ==========================
    getSporeInstallations: () => ipcRenderer.invoke('get-spore-installations'),
    hasSporeBase: () => ipcRenderer.invoke('has-spore-base'),
    hasSporeGA: () => ipcRenderer.invoke('has-spore-ga'),

    // ==========================
    // Game Launchers
    // ==========================
    launchSporeModAPI: () => ipcRenderer.invoke('launch-spore-modapi'),
    launchSporeBase: () => ipcRenderer.invoke('launch-spore-base'),

    // ==========================
    // Mod Download & Progress
    // ==========================
    downloadModWithProgress: (url, gameType, installId) => ipcRenderer.invoke('download-mod-with-progress', url, gameType, installId),
    onModDownloadProgress: (callback) => ipcRenderer.on('mod-download-progress', (_e, progress) => callback(progress)),
    removeModDownloadProgress: (callback) => ipcRenderer.removeListener('mod-download-progress', callback),
    onModInstallProgress: (callback) => ipcRenderer.on('mod-install-progress', (_e, progress) => callback(progress)),
    removeModInstallProgress: (callback) => ipcRenderer.removeListener('mod-install-progress', callback),
    onModUnzipProgress: (callback) => ipcRenderer.on('mod-unzip-progress', (_e, progress) => callback(progress)),
    removeModUnzipProgress: (callback) => ipcRenderer.removeListener('mod-unzip-progress', callback),

    // ==========================
    // Unzip Handlers
    // ==========================
    unzipMod: (zipPath) => ipcRenderer.invoke('unzip-mod', zipPath),
    unzipModTo: (zipPath, extractPath) => ipcRenderer.invoke('unzip-mod-to', zipPath, extractPath),

    // ==========================
    // HD Textures
    // ==========================
    isHDTexturesInstalled: (gameType) => ipcRenderer.invoke('is-hdtextures-installed', gameType),
    installHDTextures: (extractedPath, zipPath, gameType, installId) =>
        ipcRenderer.invoke('install-hdtextures', extractedPath, zipPath, gameType, installId),
    uninstallHDTextures: (gameType) => ipcRenderer.invoke('uninstall-hdtextures', gameType),

    // ==========================
    // 4GB Patch
    // ==========================
    is4gbPatchInstalled: (gameType) => ipcRenderer.invoke('is-4gbpatch-installed', gameType),
    install4gbPatch: (extractedPath, zipPath, gameType) => ipcRenderer.invoke('install-4gbpatch', extractedPath, zipPath, gameType),
    uninstall4gbPatch: (gameType) => ipcRenderer.invoke('uninstall-4gbpatch', gameType),

    // ==========================
    // 60FPS Unlocker
    // ==========================
    isUnlock60fpsInstalled: (gameType) => ipcRenderer.invoke('is-unlock60fps-installed', gameType),
    uninstallUnlock60fps: (gameType) => ipcRenderer.invoke('uninstall-unlock60fps', gameType),
    installSporemod: (modDir, zipPath, gameType) => ipcRenderer.invoke('install-sporemod', modDir, zipPath, gameType),

    // ==========================
    // SporeModAPI Mods
    // ==========================
    installSporemodapiMod: (modId, extractedPath, zipPath, gameType) =>
        ipcRenderer.invoke('install-sporemodapi-mod', modId, extractedPath, zipPath, gameType),
    isSporemodapiModInstalled: (modId) =>
        ipcRenderer.invoke('is-sporemodapi-mod-installed', modId),
    uninstallSporemodapiMod: (modId) =>
        ipcRenderer.invoke('uninstall-sporemodapi-mod', modId),

    // ==========================
    // Uninstall All Mods
    // ==========================
    uninstallAllMods: () => ipcRenderer.invoke('uninstall-all-mods'),
});