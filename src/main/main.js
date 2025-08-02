import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { fork } from 'child_process';
import pkg from 'electron-updater';
import http from 'http';

app.setName('Spore NEXT');

const { autoUpdater } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOD_ZIP_URL = 'http://69.62.98.110/mods/mod.zip';

let userSporePath = '', userGAPath = '', mainWindow = null;
let isInstalling = false;

let currentLang = 'en';
let translations = {};

const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
const userProfile = process.env['USERPROFILE'] || 'C:\\Users\\Default';

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
        http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode !== 200) {
                console.error('HTTP status:', response.statusCode, 'URL:', url);
                return reject(new Error('Failed to download mod.zip'));
            }
            const total = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;
            const file = fs.createWriteStream(destPath);
            response.on('data', chunk => {
                downloaded += chunk.length;
                if (total && onProgress) onProgress(Math.round((downloaded / total) * 50));
            });
            response.pipe(file);
            file.on('finish', () => file.close(() => resolve(true)));
        }).on('error', err => {
            console.error('Download error:', err);
            fs.unlink(destPath, () => reject(err));
        });
    });
}

function detectSporeBasePath() {
    const bases = [
        path.join(programFilesX86, 'Steam', 'steamapps', 'common', 'spore'),
        path.join(programFiles, 'Steam', 'steamapps', 'common', 'spore'),
        'D:\\SteamLibrary\\steamapps\\common\\spore',
        path.join(programFiles, 'EA Games', 'Spore'),
        path.join(programFilesX86, 'EA Games', 'Spore'),
        'C:\\Spore',
        'D:\\Spore'
    ];
    return bases.find(base => fs.existsSync(base)) || '';
}

function detectSporeDataPath() {
    const base = detectSporeBasePath();
    const paths = [
        path.join(programFilesX86, 'Steam', 'steamapps', 'common', 'spore', 'Data'),
        path.join(programFiles, 'Steam', 'steamapps', 'common', 'spore', 'Data'),
        'D:\\SteamLibrary\\steamapps\\common\\spore\\Data',
        base ? path.join(base, 'Data') : '',
        path.join(programFiles, 'EA Games', 'Spore', 'Data'),
        path.join(programFilesX86, 'EA Games', 'Spore', 'Data'),
        'C:\\Spore\\Data',
        'D:\\Spore\\Data'
    ];
    return paths.find(p => fs.existsSync(p)) || '';
}

function detectGADataPath() {
    const base = detectSporeBasePath();
    const paths = [
        path.join(programFilesX86, 'Steam', 'steamapps', 'common', 'spore', 'DataEP1'),
        path.join(programFiles, 'Steam', 'steamapps', 'common', 'spore', 'DataEP1'),
        'D:\\SteamLibrary\\steamapps\\common\\spore\\DataEP1',
        base ? path.join(base, 'DataEP1') : '',
        path.join(programFiles, 'EA Games', 'Spore', 'SPORE Galactic Adventures', 'Data'),
        path.join(programFilesX86, 'EA Games', 'Spore', 'SPORE Galactic Adventures', 'Data'),
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
    const base = detectSporeBasePath();
    const exes = [
        base ? path.join(base, 'SporebinEP1', 'SporeApp.exe') : '',
        path.join(programFiles, 'EA Games', 'Spore', 'SPORE Galactic Adventures', 'SporebinEP1', 'SporeApp.exe'),
        path.join(programFilesX86, 'EA Games', 'Spore', 'SPORE Galactic Adventures', 'SporebinEP1', 'SporeApp.exe'),
        'D:\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe'
    ];
    return exes.find(exe => exe && fs.existsSync(exe)) || '';
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

    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (
                input.key === 'F12' ||
                (input.control && input.shift && input.key.toLowerCase() === 'i')
            ) {
                event.preventDefault();
            }
        });
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools();
        });
    }

    mainWindow.on('maximize', e => { e.preventDefault(); mainWindow.unmaximize(); });
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.on('close', (e) => { /* ... */ });
}

app.on('ready', () => {
    createWindow();
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();

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
ipcMain.handle('open-discord', () => shell.openExternal('https://discord.gg/JqZyyugs5a'));

ipcMain.handle('set-installing', (_e, installing) => { isInstalling = !!installing; });

ipcMain.handle('download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return true;
    } catch {
        return false;
    }
});

ipcMain.handle('install-mod', async (event, modFile, target) => {
    const destPath = target === 'ga' ? (userGAPath || detectGADataPath()) : (userSporePath || detectSporeDataPath());
    if (!destPath || !fs.existsSync(destPath)) {
        console.error('Invalid destPath:', destPath);
        return false;
    }
    const configDir = path.join(destPath, 'Config');
    const modsDir = path.join(app.getPath('userData'), 'mods');
    const modSource = path.join(modsDir, modFile);

    if (!fs.existsSync(modsDir)) {
        fs.mkdirSync(modsDir, { recursive: true });
    }

    if (fs.existsSync(modSource)) {
        try { fs.unlinkSync(modSource); } catch { }
    }

    try {
        await downloadModZip(MOD_ZIP_URL, modSource, p => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                event.sender.send('mod-install-progress', p);
            }
        });
    } catch {
        console.error('Download failed');
        return false;
    }

    if (!fs.existsSync(modSource)) {
        console.error('modSource does not exist after download:', modSource);
        return false;
    }

    const workerPath = path.join(__dirname, 'installWorker.js');
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
    const baseName = path.basename(normalized).toLowerCase();

    if (type === 'spore') {
        return fs.existsSync(normalized) && baseName === 'data';
    }
    if (type === 'ga') {
        return fs.existsSync(normalized) && baseName === 'dataep1';
    }
    return false;
});

ipcMain.handle('launch-spore', () => {
    const steamPaths = [
        path.join(programFilesX86, 'Steam', 'steamapps', 'common', 'spore'),
        path.join(programFiles, 'Steam', 'steamapps', 'common', 'spore'),
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
        path.join(programFilesX86, 'Steam', 'steamapps', 'common', 'spore'),
        path.join(programFiles, 'Steam', 'steamapps', 'common', 'spore'),
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
            path.join(programFiles, 'EA Games', 'Spore', 'Data'),
            path.join(programFilesX86, 'EA Games', 'Spore', 'Data'),
            'C:\\Spore\\Data',
            'D:\\Spore\\Data',
            path.join(programFiles, 'EA Games', 'Spore', 'SPORE Galactic Adventures', 'Data'),
            path.join(programFilesX86, 'EA Games', 'Spore', 'SPORE Galactic Adventures', 'Data'),
            'D:\\Spore\\SPORE Galactic Adventures\\Data'
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