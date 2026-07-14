process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const { app, BrowserWindow, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

// configure updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = console;
autoUpdater.disableDifferentialDownload = true;
autoUpdater.verifyUpdateCodeSignature = async () => null;

app.name = 'Spore NEXT';

const nodePath = require('path');
const nodeUrl = require('url');

// submodules
const { state } = require('./main/state.cjs');
const { createTray, installModLoaderResources } = require('./main/utils.cjs');
const { handleDeepLink, startAuthServer } = require('./main/authServer.cjs');
const { setupAutoUpdater } = require('./main/updater.cjs');
const { registerIpcHandlers } = require('./main/ipcHandlers.cjs');

// register all IPC handlers
registerIpcHandlers();

// apply hardware acceleration setting before app is ready
if (!state.settings.hardwareAcceleration) {
  app.disableHardwareAcceleration();
}

function createWindow() {
  state.mainWindow = new BrowserWindow({
    width: 1420,
    height: 800,
    minWidth: 1420,
    minHeight: 800,
    useContentSize: true,
    frame: false,
    resizable: true,
    backgroundColor: '#121019',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: nodePath.join(__dirname, 'preload.js')
    }
  });

  state.mainWindow.once('ready-to-show', () => {
    if (state.mainWindow) {
      state.mainWindow.show();
    }
  });

  setTimeout(() => {
    if (state.mainWindow && !state.mainWindow.isVisible()) {
      state.mainWindow.show();
    }
  }, 800);

  const startUrl = process.env.ELECTRON_START_URL || nodeUrl.format({
    pathname: nodePath.join(__dirname, 'dist/index.html'),
    protocol: 'file:',
    slashes: true
  });

  state.mainWindow.loadURL(startUrl);

  // disable F11 key
  state.mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      event.preventDefault();
    }
  });

  // close handler to minimize to tray
  state.mainWindow.on('close', (event) => {
    if (state.settings.minimizeToTray && !state.isQuitting) {
      event.preventDefault();
      state.mainWindow.hide();
    }
  });

  // setup system tray if enabled
  if (state.settings.minimizeToTray) {
    createTray(state.mainWindow);
  }

  // prevent right-click
  state.mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // prevent drag/drop file navigation and external link navigation in the main window
  state.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // only allow local file loads and the designated start URL
    const isLocal = navigationUrl.startsWith('file://') || navigationUrl.startsWith(process.env.ELECTRON_START_URL || '');
    if (!isLocal) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  state.mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    const { shell } = require('electron');
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });

  // blocks browser keyboard shortcuts (reload, zoom, search, etc)
  state.mainWindow.webContents.on('before-input-event', (event, input) => {
    // disables reload shortcuts
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      event.preventDefault();
    }
    // disables zoom shortcuts 
    if (input.control && (input.key === '=' || input.key === '-' || input.key === '0')) {
      event.preventDefault();
    }
    // disables page search shortcut
    if (input.control && input.key.toLowerCase() === 'f') {
      event.preventDefault();
    }
    // disablse Dev Tools in production builds
    if (app.isPackaged) {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault();
      }
    }
  });

  // lock client visual zoom factor
  state.mainWindow.webContents.on('did-finish-load', () => {
    state.mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    state.mainWindow.webContents.setZoomFactor(1);
  });
}

// enforce single instance lock for deep links
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // focus the main window
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore();
      state.mainWindow.show();
      state.mainWindow.focus();
    }
    // parse the deep link from command line arguments
    const urlArg = commandLine.find(arg => arg.startsWith('sporenext://'));
    if (urlArg) {
      handleDeepLink(urlArg);
    }
  });

  // handle open url on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // register the protocol client
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('sporenext', process.execPath, [nodePath.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('sporenext');
  }
}

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    Object.keys(headers).forEach(key => {
      if (key.toLowerCase() === 'content-security-policy') {
        delete headers[key];
      }
    });

    callback({
      responseHeaders: {
        ...headers,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https://flagcdn.com https://cdn.discordapp.com https://xwbvtavvrqfxfnnmbdht.supabase.co https://avatars.githubusercontent.com https://github.com",
            "connect-src 'self' https://xwbvtavvrqfxfnnmbdht.supabase.co wss://xwbvtavvrqfxfnnmbdht.supabase.co https://api.github.com https://github.com https://discord.com https://discordapp.com ws://localhost:5173 http://localhost:5173 http://localhost:4242",
            "media-src 'self' blob:",
          ].join('; ')
        ]
      }
    });
  });

  createWindow();
  setupAutoUpdater();
  startAuthServer();
  await installModLoaderResources();

  // handle link if launched with it
  const urlArg = process.argv.find(arg => arg.startsWith('sporenext://'));
  if (urlArg) {
    setTimeout(() => {
      handleDeepLink(urlArg);
    }, 1500);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (state.authServer) {
    state.authServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
