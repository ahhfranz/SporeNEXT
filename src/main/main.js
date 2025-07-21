import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { fork } from 'child_process';
import pkg from 'electron-updater';

const { autoUpdater } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOD_ZIP_URL = 'http://69.62.98.110/mods/mod.zip';

let userSporePath = '', userGAPath = '', mainWindow = null;
let isInstalling = false;

let currentLang = 'en';
let translations = {};

function loadTranslations(lang) {
    const localePath = path.join(__dirname, '../../public/locales', lang + '.json');
    try {
        translations = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    } catch {
        translations = {};
    }
}
ipcMain.handle('set-language', (_e, lang) => {
    currentLang = lang;
    loadTranslations(lang);
});
loadTranslations(currentLang);

function downloadModZip(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        http.get(url, (response) => {
            if (response.statusCode !== 200) return reject(new Error('Failed to download mod.zip'));
            const total = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;
            const file = fs.createWriteStream(destPath);
            response.on('data', chunk => {
                downloaded += chunk.length;
                if (total && onProgress) onProgress(Math.round((downloaded / total) * 50));
            });
            response.pipe(file);
            file.on('finish', () => file.close(() => resolve(true)));
        }).on('error', err => fs.unlink(destPath, () => reject(err)));
    });
}

function detectSporeBasePath() {
    const bases = [
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\spore',
        'C:\\Program Files\\Steam\\steamapps\\common\\spore',
        'D:\\SteamLibrary\\steamapps\\common\\spore',
        'C:\\Program Files\\EA Games\\Spore',
        'C:\\Spore',
        'D:\\Spore'
    ];
    return bases.find(base => fs.existsSync(base)) || '';
}

function detectSporeDataPath() {
    const base = detectSporeBasePath();
    const dataPath = base ? path.join(base, 'Data') : '';
    return dataPath && fs.existsSync(dataPath) ? dataPath : '';
}

function detectGADataPath() {
    const paths = [
        path.join(detectSporeBasePath(), 'DataEP1'),
        'C:\\Program Files\\EA Games\\Spore\\SPORE Galactic Adventures\\Data',
        'C:\\Program Files (x86)\\EA Games\\Spore\\SPORE Galactic Adventures\\Data',
        'D:\\Spore\\SPORE Galactic Adventures\\Data'
    ];
    return paths.find(p => fs.existsSync(p)) || '';
}

function detectSporeExe() {
    const base = detectSporeBasePath();
    const exePath = base ? path.join(base, 'SporeBin', 'SporeApp.exe') : '';
    return exePath && fs.existsSync(exePath) ? exePath : '';
}

function detectGAExe() {
    const exes = [
        path.join(detectSporeBasePath(), 'SporebinEP1', 'SporeApp.exe'),
        'C:\\Program Files\\EA Games\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe',
        'C:\\Program Files (x86)\\EA Games\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe',
        'D:\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe'
    ];
    return exes.find(exe => fs.existsSync(exe)) || '';
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, frame: false, resizable: false, maximizable: false,
        icon: path.join(__dirname, '../../public/assets/spore.png'),
        webPreferences: {
            preload: path.join(__dirname, '../../src/main/preload.js'),
            contextIsolation: true, nodeIntegration: false
        },
        backgroundColor: '#222222'
    });
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
    mainWindow.on('maximize', e => { e.preventDefault(); mainWindow.unmaximize(); });
    mainWindow.on('closed', () => { mainWindow = null; });

    mainWindow.on('close', (e) => {
        if (isInstalling) {
            const t = translations;
            const choice = dialog.showMessageBoxSync(mainWindow, {
                type: 'warning',
                buttons: [t.cancel || 'Cancelar', t.closeAnyway || 'Cerrar de todos modos'],
                defaultId: 0,
                cancelId: 0,
                title: t.installInProgressTitle || 'Instalación en curso',
                message: t.closeWhileInstalling || 'Hay una instalación en curso. Si cierras el launcher ahora, la instalación puede quedar incompleta o dañada.\n\n¿Seguro que quieres cerrar?'
            });
            if (choice === 0) {
                e.preventDefault();
            }
        }
    });
}

app.on('ready', () => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', (info) => {
        mainWindow?.webContents.send('update-available', info.version);
    });
    autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update-downloaded'));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });

ipcMain.handle('set-spore-path', (_e, v) => { if (typeof v === 'string') userSporePath = path.normalize(v).replace(/[\\\/]+$/, ''); });
ipcMain.handle('set-ga-path', (_e, v) => { if (typeof v === 'string') userGAPath = path.normalize(v).replace(/[\\\/]+$/, ''); });

ipcMain.handle('close-window', () => mainWindow?.close());
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('open-mods-folder', () => {
    const modsPath = path.join(app.getPath('userData'), 'mods');
    if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });
    shell.openPath(modsPath);
});
ipcMain.handle('open-discord', () => shell.openExternal('https://discord.com/users/640310157796179978'));

ipcMain.handle('set-installing', (_e, installing) => { isInstalling = !!installing; });

ipcMain.handle('install-mod', async (event, modFile, target) => {
    const destPath = target === 'ga' ? (userGAPath || detectGADataPath()) : (userSporePath || detectSporeDataPath());
    if (!destPath || !fs.existsSync(destPath)) return false;
    const configDir = path.join(destPath, 'Config');
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    const modsDir = path.join(app.getPath('userData'), 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
    const modSource = path.join(modsDir, modFile);

    const workerPath = path.join(__dirname, 'installWorker.js');
    if (fs.existsSync(modSource)) {
        try { fs.unlinkSync(modSource); } catch { }
    }
    try {
        await downloadModZip(MOD_ZIP_URL, modSource, p => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                event.sender.send('mod-install-progress', p);
            }
        });
    } catch { return false; }
    if (!fs.existsSync(modSource)) return false;
    const installResult = await new Promise(resolve => {
        const child = fork(workerPath, [modSource, destPath, configDir], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
        child.on('message', msg => {
            if (msg.progress !== undefined && mainWindow && !mainWindow.isDestroyed()) {
                event.sender.send('mod-install-progress', 50 + Math.round(msg.progress / 2));
            }
            if (msg.success !== undefined) { resolve(msg.success); child.kill(); }
        });
        child.on('error', () => { resolve(false); child.kill(); });
        child.on('exit', () => { });
    });
    if (installResult && fs.existsSync(modSource)) { try { fs.unlinkSync(modSource); } catch { } }
    return installResult;
});

ipcMain.handle('detect-spore-path', () => detectSporeDataPath());
ipcMain.handle('detect-ga-path', () => detectGADataPath());
ipcMain.handle('browse-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled || result.filePaths.length === 0 ? '' : result.filePaths[0];
});
ipcMain.handle('check-spore-path', (_e, folderPath, type) => {
    if (!folderPath) return false;
    const normalized = path.normalize(folderPath).replace(/[\\\/]+$/, '');
    if (type === 'spore')
        return fs.existsSync(normalized) && path.basename(normalized).toLowerCase() === 'data';
    if (type === 'ga') {
        const isDataEP1 = fs.existsSync(normalized) && path.basename(normalized).toLowerCase() === 'dataep1';
        const isEAData = fs.existsSync(normalized) && path.basename(normalized).toLowerCase() === 'data' && normalized.toLowerCase().includes('spore galactic adventures');
        return isDataEP1 || isEAData;
    }
    return false;
});

ipcMain.handle('launch-spore', () => {
    const steamPaths = [
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\spore',
        'C:\\Program Files\\Steam\\steamapps\\common\\spore',
        'D:\\SteamLibrary\\steamapps\\common\\spore'
    ];
    const exePath = detectSporeExe();
    if (steamPaths.some(p => fs.existsSync(p))) {
        shell.openExternal('steam://run/17390');
        return true;
    } else if (exePath && fs.existsSync(exePath)) {
        shell.openPath(exePath);
        return true;
    }
    return false;
});

ipcMain.handle('launch-ga', () => {
    const steamPaths = [
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\spore',
        'C:\\Program Files\\Steam\\steamapps\\common\\spore',
        'D:\\SteamLibrary\\steamapps\\common\\spore'
    ];
    const exePath = detectGAExe();
    if (steamPaths.some(p => fs.existsSync(p))) {
        shell.openExternal('steam://run/24720');
        return true;
    } else if (exePath && fs.existsSync(exePath)) {
        shell.openPath(exePath);
        return true;
    }
    return false;
});

ipcMain.handle('get-app-version', () => {
    const pkgPath = path.join(__dirname, '../../package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkgJson.version;
});

ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.handle('show-confirm', async (_e, options) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: [options.okText, options.cancelText],
        defaultId: 0,
        cancelId: 1,
        title: options.title,
        message: options.message
    });
    return result.response === 0;
});

ipcMain.handle('is-mod-installed', async (_e, target) => {
    const destPath = target === 'ga' ? (userGAPath || detectGADataPath()) : (userSporePath || detectSporeDataPath());
    if (!destPath || !fs.existsSync(destPath)) return false;
    const files = [
        'HD_Decals.package',
        'HD_Editor-background.package',
        'HD_Empire-backgrounds.package',
        'HD_Galaxy.package',
        'HD_Water.package'
    ];
    return files.every(f => fs.existsSync(path.join(destPath, f)));
});

ipcMain.handle('uninstall-all-mods', async () => {
    try {
        const modFiles = [
            'HD_Decals.package', 'HD_Editor-background.package', 'HD_Empire-backgrounds.package', 'HD_Galaxy.package',
            'HD_LOD-High.package', 'HD_Meshes.package', 'HD_Meshes2.package', 'HD_Particles.package', 'HD_Parts.package',
            'HD_Planet-textures.package', 'HD_Water.package', 'HD_Ground.package', 'HD_Background.package',
            'HD_Textures1.package', 'HD_Textures2.package', 'HD_Textures3.package'
        ];
        const configFiles = ['ConfigManager.txt', 'Properties.txt'];
        const folders = [
            detectSporeDataPath(), detectGADataPath(),
            'C:\\Program Files\\EA Games\\Spore\\Data', 'C:\\Program Files (x86)\\EA Games\\Spore\\Data', 'D:\\Spore\\Data',
            'C:\\Program Files\\EA Games\\Spore\\SPORE Galactic Adventures\\Data', 'C:\\Program Files (x86)\\EA Games\\Spore\\SPORE Galactic Adventures\\Data', 'D:\\Spore\\SPORE Galactic Adventures\\Data'
        ].filter((f, i, arr) => f && fs.existsSync(f) && arr.indexOf(f) === i);
        let success = true;
        for (const folder of folders) {
            for (const file of modFiles) {
                const filePath = path.join(folder, file);
                if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch { success = false; }
            }
            const configDir = path.join(folder, 'Config');
            for (const file of configFiles) {
                const configPath = path.join(configDir, file);
                if (fs.existsSync(configPath)) try { fs.unlinkSync(configPath); } catch { success = false; }
            }
        }
        return success;
    } catch { return false; }
});