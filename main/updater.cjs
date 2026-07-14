const { autoUpdater } = require('electron-updater');
const { state } = require('./state.cjs');

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('updater-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('updater-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] Update not available:', info ? info.version : '');
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('updater-not-available', info);
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err);
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('updater-error', err ? err.message : 'Unknown error');
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('updater-download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send('updater-downloaded', info);
    }
  });
}

module.exports = {
  setupAutoUpdater
};
