const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const state = {
  mainWindow: null,
  isQuitting: false,
  tray: null,
  authServer: null,
  lastProcessedToken: '',
  lastProcessedTime: 0,
  settings: {
    autoStart: false,
    minimizeToTray: false,
    hardwareAcceleration: true,
    sporeModLoaderInstalled: false,
    sporeModLoaderVersion: ''
  }
};

// load settings
try {
  if (fs.existsSync(settingsPath)) {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    state.settings = { ...state.settings, ...data };
  }
} catch (err) {
  console.error('Error reading settings.json:', err);
}

module.exports = {
  state,
  settingsPath
};
