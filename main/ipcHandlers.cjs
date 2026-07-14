const path = require('path');
const fs = require('fs');
const { app, ipcMain, BrowserWindow, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { state, settingsPath } = require('./state.cjs');
const launcherService = require('../services/launcherService.cjs');
const downloadService = require('../services/downloadService.cjs');
const { applyAutoStart, createTray, installModLoaderResources } = require('./utils.cjs');

function registerIpcHandlers() {
  // wwindow commands
  ipcMain.on('window-minimize', (event) => {
    const webWindow = BrowserWindow.fromWebContents(event.sender);
    if (webWindow) webWindow.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const webWindow = BrowserWindow.fromWebContents(event.sender);
    if (!webWindow) return;
    if (webWindow.isMaximized()) {
      webWindow.unmaximize();
    } else {
      webWindow.maximize();
    }
  });

  ipcMain.handle('window-is-maximized', (event) => {
    const webWindow = BrowserWindow.fromWebContents(event.sender);
    return webWindow ? webWindow.isMaximized() : false;
  });

  ipcMain.on('window-close', (event) => {
    const webWindow = BrowserWindow.fromWebContents(event.sender);
    if (webWindow) webWindow.close();
  });

  // IPC handlers for the settings tab
  ipcMain.handle('get-app-settings', () => {
    return state.settings;
  });

  ipcMain.handle('update-app-setting', (event, key, value) => {
    state.settings[key] = value;
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(state.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings.json:', err);
    }

    if (key === 'autoStart') {
      applyAutoStart(value);
    }

    if (key === 'minimizeToTray') {
      if (value) {
        if (state.mainWindow) createTray(state.mainWindow);
      } else {
        if (state.tray) {
          state.tray.destroy();
          state.tray = null;
        }
      }
    }

    return state.settings;
  });

  ipcMain.on('relaunch-app', () => {
    state.isQuitting = true;
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('open-path', async (event, fullPath) => {
    if (!fullPath) return false;
    try {
      const normalized = path.normalize(fullPath);
      if (fs.existsSync(normalized)) {
        const isDir = fs.statSync(normalized).isDirectory();
        const dirPath = isDir ? normalized : path.dirname(normalized);
        await shell.openPath(dirPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to open path:', err);
      return false;
    }
  });

  // Spore NEXT handlers
  ipcMain.handle('launcher-detect', async () => {
    return await launcherService.detectGames();
  });

  ipcMain.handle('launcher-run', async (event, gameName) => {
    await installModLoaderResources();
    return await launcherService.launchGame(gameName);
  });

  ipcMain.handle('launcher-kill', async () => {
    return await launcherService.killGame();
  });

  ipcMain.handle('launcher-status', async () => {
    return await launcherService.checkGameRunning();
  });

  // Spore Mod Manager handlers
  ipcMain.handle('mod-list-installed', async () => {
    return await launcherService.listInstalledMods();
  });

  ipcMain.handle('get-mod-components', async (event, filenameOrPath) => {
    const filePath = path.isAbsolute(filenameOrPath)
      ? filenameOrPath
      : path.join(downloadService.getDownloadDir(), filenameOrPath);
    return await launcherService.getModComponents(filePath);
  });

  ipcMain.handle('mod-install', async (event, filenameOrPath, selectedIndices) => {
    const filePath = path.isAbsolute(filenameOrPath)
      ? filenameOrPath
      : path.join(downloadService.getDownloadDir(), filenameOrPath);
    return await launcherService.installMod(filePath, selectedIndices);
  });

  ipcMain.handle('mod-uninstall', async (event, modName, modDetails) => {
    return await launcherService.uninstallMod(modName, modDetails);
  });

  ipcMain.handle('mod-update', async (event, filename) => {
    const downloadDir = downloadService.getDownloadDir();
    const filePath = path.join(downloadDir, filename);
    return await launcherService.updateMod(filePath);
  });

  ipcMain.handle('download-mod', async (event, modId, downloadInfo) => {
    try {
      const webWindow = BrowserWindow.fromWebContents(event.sender);
      const destPath = await downloadService.downloadMod(modId, downloadInfo, (progressData) => {
        if (webWindow && !webWindow.isDestroyed()) {
          webWindow.webContents.send('download-progress', {
            modId,
            percent: progressData.percent,
            downloadedBytes: progressData.downloadedBytes,
            totalBytes: progressData.totalBytes,
            status: 'downloading'
          });
        }
      });

      if (webWindow && !webWindow.isDestroyed()) {
        webWindow.webContents.send('download-progress', {
          modId,
          percent: 100,
          status: 'completed',
          filePath: destPath
        });
      }
      return { success: true, filename: path.basename(destPath), filePath: destPath };
    } catch (err) {
      console.error(`Error downloading mod ${modId}:`, err);
      const webWindow = BrowserWindow.fromWebContents(event.sender);
      if (webWindow && !webWindow.isDestroyed()) {
        webWindow.webContents.send('download-progress', {
          modId,
          percent: 0,
          status: 'failed',
          error: err.message
        });
      }
      throw err;
    }
  });

  ipcMain.handle('get-downloaded-files', async () => {
    return downloadService.getDownloadedFiles();
  });

  ipcMain.handle('resolve-github-asset', async (event, githubUrl, updatedAt) => {
    return downloadService.resolveGithubAsset(githubUrl, updatedAt);
  });

  ipcMain.handle('select-local-mod-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Spore Mod File',
      filters: [
        { name: 'Spore Mods', extensions: ['sporemod', 'package', 'zip'] }
      ],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Cache management handlers
  ipcMain.handle('get-cache-size', () => {
    return downloadService.getCacheSize();
  });

  ipcMain.handle('get-cache-files', () => {
    return downloadService.getCacheFiles();
  });

  ipcMain.handle('delete-cache-file', (event, filename) => {
    return downloadService.deleteCacheFile(filename);
  });

  ipcMain.handle('clear-cache', () => {
    return downloadService.clearCache();
  });

  // updater handlers
  ipcMain.handle('updater-check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err) {
      console.error('[Updater] Check failed:', err);
      throw err;
    }
  });

  ipcMain.handle('updater-download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      console.error('[Updater] Download failed:', err);
      throw err;
    }
  });

  ipcMain.handle('updater-install', () => {
    try {
      state.isQuitting = true;
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (err) {
      console.error('[Updater] Install failed:', err);
      throw err;
    }
  });

  //Galaxy reset handlers
  ipcMain.handle('galaxy-list-folders', () => {
    try {
      const sporeDir = path.join(app.getPath('appData'), 'Spore');
      if (!fs.existsSync(sporeDir)) return [];
      return fs.readdirSync(sporeDir).filter(name => {
        const full = path.join(sporeDir, name);
        return fs.statSync(full).isDirectory() && name.toLowerCase().includes('games');
      });
    } catch (err) {
      console.error('galaxy-list-folders error:', err);
      throw err;
    }
  });

  ipcMain.handle('galaxy-swap-folder', (event, targetName) => {
    try {
      const sporeDir = path.join(app.getPath('appData'), 'Spore');
      const currentGames = path.join(sporeDir, 'Games');
      const targetPath = path.join(sporeDir, targetName);

      if (targetName === 'Games') {
        // Convert "Games" to next available backup
        let n = 1;
        while (fs.existsSync(path.join(sporeDir, `Games.backup-${n}`))) n++;
        fs.renameSync(currentGames, path.join(sporeDir, `Games.backup-${n}`));
      } else {
        // Swap: current Games > next backup and target > Games
        let n = 1;
        while (fs.existsSync(path.join(sporeDir, `Games.backup-${n}`))) n++;
        if (fs.existsSync(currentGames)) {
          fs.renameSync(currentGames, path.join(sporeDir, `Games.backup-${n}`));
        }
        fs.renameSync(targetPath, currentGames);
      }
      return { success: true };
    } catch (err) {
      console.error('galaxy-swap-folder error:', err);
      throw err;
    }
  });
}

module.exports = {
  registerIpcHandlers
};
