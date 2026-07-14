const path = require('path');
const fs = require('fs');
const { app, Tray, Menu } = require('electron');
const { state, settingsPath } = require('./state.cjs');
const launcherService = require('../services/launcherService.cjs');
const downloadService = require('../services/downloadService.cjs');

function applyAutoStart(value) {
  try {
    app.setLoginItemSettings({
      openAtLogin: value,
      path: app.getPath('exe')
    });
  } catch (err) {
  }
}

function createTray(win) {
  if (state.tray) return;
  const iconPath = path.join(__dirname, '..', app.isPackaged ? 'dist/logo.png' : 'public/logo.png');
  try {
    state.tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (win) {
            win.show();
            win.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Spore NEXT',
        click: () => {
          state.isQuitting = true;
          app.quit();
        }
      }
    ]);
    state.tray.setToolTip('Spore NEXT');
    state.tray.setContextMenu(contextMenu);

    state.tray.on('click', () => {
      if (win) {
        win.show();
        win.focus();
      }
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

async function installModLoaderResources() {
  try {
    const detection = await launcherService.detectGames();
    if (detection && detection.sporega && detection.sporega.installed && detection.sporega.path) {
      const exePath = detection.sporega.path;
      const binDir = path.dirname(exePath); // .../SporebinEP1
      const rootDir = path.dirname(binDir); // game root

      const destSporebinDll = path.join(binDir, 'dinput8.dll');
      const destModLoader = path.join(rootDir, 'SporeModLoader');

      console.log('[Spore NEXT] Checking for Spore Mod Loader updates...');
      let isUpdated = false;
      let hasError = false;

      try {
        const result = await downloadService.installOrUpdateSporeModLoader(rootDir, state.settings.sporeModLoaderVersion);
        if (result.updated) {
          state.settings.sporeModLoaderInstalled = true;
          state.settings.sporeModLoaderVersion = result.version;
          // persist settings
          fs.writeFileSync(settingsPath, JSON.stringify(state.settings, null, 2), 'utf-8');
          console.log(`[Spore NEXT] Spore Mod Loader successfully updated/installed to version ${result.version}`);
          isUpdated = true;
        }
      } catch (networkOrExtractErr) {
        hasError = true;
        console.warn('[Spore NEXT] Could not check or download Spore Mod Loader update from GitHub:', networkOrExtractErr.message);
        // fallback: if files exist, then we consider it installed 
        const filesExist = fs.existsSync(destSporebinDll) && fs.existsSync(destModLoader);
        if (filesExist) {
          console.log('[Spore NEXT] Spore Mod Loader files detected locally.');
          if (!state.settings.sporeModLoaderInstalled) {
            state.settings.sporeModLoaderInstalled = true;
            fs.writeFileSync(settingsPath, JSON.stringify(state.settings, null, 2), 'utf-8');
          }
        } else {
          console.error('[Spore NEXT] Spore Mod Loader is not installed and could not be downloaded from GitHub');
        }
      }
      // we run "SporeModManager.exe -y update-modapi" just in case
      try {
        await launcherService.updateModAPI();
      } catch (apiErr) {
      }

      if (!isUpdated && !hasError) {
        console.log('[Spore NEXT] Spore Mod Loader is up to date');
      }
    }
  } catch (err) {
    console.error('[Spore NEXT] Failed to install/update Spore Mod Loader:', err);
  }
}

module.exports = {
  applyAutoStart,
  createTray,
  installModLoaderResources
};
