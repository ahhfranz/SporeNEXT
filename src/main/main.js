import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { fork } from 'child_process';
import { dialog } from 'electron';
import http from 'http';
import https from 'https';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOD_ZIP_URL = 'http://69.62.98.110/mods/mod.zip';

let userSporePath = '';
let userGAPath = '';
let mainWindow = null;

function downloadModZip(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error('Failed to download mod.zip'));
                return;
            }
            const total = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;
            const file = fs.createWriteStream(destPath);
            response.on('data', (chunk) => {
                downloaded += chunk.length;
                if (total && onProgress) {
                    const percent = Math.round((downloaded / total) * 50);
                    onProgress(percent);
                }
            });
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(true));
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => reject(err));
        });
    });
}

function detectSporeBasePath() {
    const possibleBases = [
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\spore',
        'C:\\Program Files\\Steam\\steamapps\\common\\spore',
        'D:\\SteamLibrary\\steamapps\\common\\spore',
        'C:\\Program Files\\EA Games\\Spore',
        'C:\\Spore',
        'D:\\Spore'
    ];
    for (const base of possibleBases) {
        if (fs.existsSync(base)) {
            return base;
        }
    }
    return '';
}

function detectSporeDataPath() {
    const base = detectSporeBasePath();
    if (!base) return '';
    const dataPath = path.join(base, 'Data');
    return fs.existsSync(dataPath) ? dataPath : '';
}

function detectGADataPath() {
    const possibleGADataPaths = [
        path.join(detectSporeBasePath(), 'DataEP1'),
        'C:\\Program Files\\EA Games\\Spore\\SPORE Galactic Adventures\\Data',
        'C:\\Program Files (x86)\\EA Games\\Spore\\SPORE Galactic Adventures\\Data',
        'D:\\Spore\\SPORE Galactic Adventures\\Data'
    ];
    for (const gaPath of possibleGADataPaths) {
        if (fs.existsSync(gaPath)) {
            return gaPath;
        }
    }
    return '';
}

function detectSporeExe() {
    const base = detectSporeBasePath();
    if (!base) return '';
    const exePath = path.join(base, 'SporeBin', 'SporeApp.exe');
    return fs.existsSync(exePath) ? exePath : '';
}

function detectGAExe() {
    const possibleGAExes = [
        path.join(detectSporeBasePath(), 'SporebinEP1', 'SporeApp.exe'),
        'C:\\Program Files\\EA Games\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe',
        'C:\\Program Files (x86)\\EA Games\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe',
        'D:\\Spore\\SPORE Galactic Adventures\\SporebinEP1\\SporeApp.exe'
    ];
    for (const exePath of possibleGAExes) {
        if (fs.existsSync(exePath)) {
            return exePath;
        }
    }
    return '';
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        resizable: false,
        maximizable: false,
        icon: path.join(__dirname, '../../public/assets/spore.png'),
        webPreferences: {
            preload: path.join(__dirname, '../../src/main/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        backgroundColor: '#222222',
    });

    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

    mainWindow.on('maximize', (event) => {
        event.preventDefault();
        mainWindow.unmaximize();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.handle('set-spore-path', (event, pathValue) => {
    userSporePath = pathValue;
});
ipcMain.handle('set-ga-path', (event, pathValue) => {
    userGAPath = pathValue;
});

ipcMain.handle('close-window', () => {
    mainWindow?.close();
});

ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
});

ipcMain.handle('open-mods-folder', () => {
    const modsPath = path.join(app.getPath('userData'), 'mods');
    if (!fs.existsSync(modsPath)) {
        fs.mkdirSync(modsPath, { recursive: true });
    }
    shell.openPath(modsPath);
});

ipcMain.handle('open-discord', () => {
    shell.openExternal('https://discord.com/users/640310157796179978');
});

ipcMain.handle('install-mod', async (event, modFile, target) => {
    let destPath;
    if (target === 'ga') {
        destPath = userGAPath || detectGADataPath();
    } else if (target === 'spore') {
        destPath = userSporePath || detectSporeDataPath();
    }
    if (!destPath || !fs.existsSync(destPath)) {
        console.error('Ruta de destino no encontrada');
        return false;
    }

    const configDir = path.join(destPath, 'Config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const modSource = path.join(__dirname, '../../Mods', modFile);
    const workerPath = path.join(__dirname, 'installWorker.js');

    if (!fs.existsSync(modSource)) {
        try {
            await downloadModZip(MOD_ZIP_URL, modSource, (percent) => {
                event.sender.send('mod-install-progress', percent);
            });
        } catch (err) {
            console.error('No se pudo descargar el mod:', err);
            return false;
        }
    }

    if (!fs.existsSync(modSource)) {
        console.error('No se encontró el archivo del mod:', modSource);
        return false;
    }

    return await new Promise((resolve) => {
        const child = fork(workerPath, [modSource, destPath, configDir], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        child.on('message', (msg) => {
            if (msg.progress !== undefined) {
                const percent = 50 + Math.round(msg.progress / 2);
                event.sender.send('mod-install-progress', percent);
            }
            if (msg.success !== undefined) {
                resolve(msg.success);
                child.kill();
            }
        });

        child.on('error', (err) => {
            resolve(false);
            child.kill();
        });

        child.on('exit', () => { });
    });
});

ipcMain.on('uninstall-mod', (event, modName) => {
    const modsDir = path.join(app.getPath('userData'), 'mods');
    const modFile = path.join(modsDir, modName);
    fs.unlink(modFile, (err) => {
        event.reply('uninstall-mod-result', !err);
    });
});

ipcMain.on('check-for-updates', (event) => {
    setTimeout(() => {
        event.reply('update-check-result', { upToDate: true, version: 'v6.6.5' });
    }, 1000);
});

ipcMain.handle('detect-spore-path', () => {
    return detectSporeDataPath();
});

ipcMain.handle('detect-ga-path', () => {
    return detectGADataPath();
});

ipcMain.handle('browse-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        return '';
    }
    return result.filePaths[0];
});

ipcMain.handle('check-spore-path', (event, folderPath, type) => {
    if (!folderPath) return false;
    const normalizedPath = path.normalize(folderPath).replace(/[\\\/]+$/, '');
    if (type === 'spore') {
        return fs.existsSync(normalizedPath) && path.basename(normalizedPath).toLowerCase() === 'data';
    } else if (type === 'ga') {
        const isDataEP1 = fs.existsSync(normalizedPath) && path.basename(normalizedPath).toLowerCase() === 'dataep1';
        const isEAData = fs.existsSync(normalizedPath) &&
            path.basename(normalizedPath).toLowerCase() === 'data' &&
            normalizedPath.toLowerCase().includes('spore galactic adventures');
        return isDataEP1 || isEAData;
    }
    return false;
});

ipcMain.handle('launch-spore', () => {
    const exePath = detectSporeExe();
    if (exePath) {
        shell.openPath(exePath);
        return true;
    }
    return false;
});

ipcMain.handle('launch-ga', () => {
    const exePath = detectGAExe();
    if (exePath) {
        shell.openPath(exePath);
        return true;
    }
    return false;
});

ipcMain.handle('uninstall-all-mods', async () => {
    try {
        const modFiles = [
            'HD_Decals.package',
            'HD_Editor-background.package',
            'HD_Empire-backgrounds.package',
            'HD_Galaxy.package',
            'HD_LOD-High.package',
            'HD_Meshes.package',
            'HD_Meshes2.package',
            'HD_Particles.package',
            'HD_Parts.package',
            'HD_Planet-textures.package'
        ];
        const configFiles = [
            'ConfigManager.txt',
            'Properties.txt'
        ];
        const folders = [
            detectSporeDataPath(),
            detectGADataPath(),
            'C:\\Program Files\\EA Games\\Spore\\Data',
            'C:\\Program Files (x86)\\EA Games\\Spore\\Data',
            'D:\\Spore\\Data',
            'C:\\Program Files\\EA Games\\Spore\\SPORE Galactic Adventures\\Data',
            'C:\\Program Files (x86)\\EA Games\\Spore\\SPORE Galactic Adventures\\Data',
            'D:\\Spore\\SPORE Galactic Adventures\\Data'
        ].filter((folder, idx, arr) => folder && fs.existsSync(folder) && arr.indexOf(folder) === idx);

        let success = true;
        for (const folder of folders) {
            for (const file of modFiles) {
                const filePath = path.join(folder, file);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch {
                        success = false;
                    }
                }
            }
            const configDir = path.join(folder, 'Config');
            for (const file of configFiles) {
                const configPath = path.join(configDir, file);
                if (fs.existsSync(configPath)) {
                    try {
                        fs.unlinkSync(configPath);
                    } catch {
                        success = false;
                    }
                }
            }
        }
        return success;
    } catch {
        return false;
    }
});