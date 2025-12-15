import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import pkg from 'electron-updater';
import fetch from 'node-fetch';
import crypto from 'crypto';
import WinReg from 'winreg';
import https from 'https';
import os from 'os';
import { fork, spawn, exec } from 'child_process';
import { parseStringPromise, Builder } from 'xml2js';

function logToFile(...args) {
    const logPath = path.join(app.getPath('userData'), 'sporenext.log');
    const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n';
    fs.appendFileSync(logPath, msg);
}

logToFile('Launcher started');

ipcMain.handle('renderer-log', (_e, msg) => {
    logToFile('[RENDERER]', msg);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyFolderRecursiveSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        if (fs.lstatSync(srcPath).isDirectory()) {
            copyFolderRecursiveSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const appdataSporeModAPI = path.join(process.env.APPDATA, 'Spore ModAPI');
const devSporeModAPI = path.join(__dirname, '../../resources/SporeModAPI');
if (
    !fs.existsSync(appdataSporeModAPI) ||
    fs.readdirSync(appdataSporeModAPI).length === 0
) {
    copyFolderRecursiveSync(devSporeModAPI, appdataSporeModAPI);
}

app.setName('Spore NEXT');

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const { autoUpdater } = pkg;
const activeDownloads = {};
const activeZipTasks = {};

let mainWindow = null;
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

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1360,
        height: 768,
        minWidth: 1360,
        minHeight: 768,
        frame: false,
        resizable: false,
        maximizable: true,
        icon: path.join(__dirname, '../../public/assets/spore.png'),
        webPreferences: {
            preload: path.join(__dirname, '../../src/main/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false
        },
        transparent: true,
        backgroundColor: '#00000000',
    });
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

    mainWindow.webContents.setBackgroundThrottling(false);

    mainWindow.webContents.on('did-finish-load', () => { });

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11') {
            event.preventDefault();
            return;
        }
        if (
            app.isPackaged &&
            (
                input.key === 'F12' ||
                (input.control && input.shift && input.key.toLowerCase() === 'i')
            )
        ) {
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.on('maximize', () => {
        mainWindow.setResizable(false);
        mainWindow.webContents.send('window-maximize-changed', true);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.setResizable(false);
        mainWindow.webContents.send('window-maximize-changed', false);
    });
    mainWindow.on('enter-full-screen', () => {
        mainWindow.setResizable(false);
    });
    mainWindow.on('leave-full-screen', () => {
        mainWindow.setResizable(false);
    });
    mainWindow.on('focus', () => {
        mainWindow.webContents.send('window-focused');
    });
    mainWindow.on('restore', () => {
        mainWindow.webContents.send('window-focused');
    });
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

ipcMain.handle('close-window', () => mainWindow?.close());
ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('open-mods-folder', () => {
    const modsPath = path.join(app.getPath('userData'), 'mods');
    if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });
    shell.openPath(modsPath);
});
ipcMain.handle('open-discord', () => shell.openExternal('https://discord.gg/JqZyyugs5a'));
ipcMain.handle('open-kofi', () => shell.openExternal('https://ko-fi.com/franzlabs'));
ipcMain.handle('open-external', (_e, url) => shell.openExternal(url));

ipcMain.handle('set-installing', (_e, installing) => { isInstalling = !!installing; });

ipcMain.handle('download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return true;
    } catch {
        return false;
    }
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

ipcMain.handle('download-mod-with-progress', async (_event, url, gameType, installId) => {
    const urlObj = new URL(url);
    let fileId = urlObj.searchParams.get('id');
    if (!fileId) {
        fileId = path.basename(urlObj.pathname, '.zip');
    }

    if (!activeZipTasks[fileId]) activeZipTasks[fileId] = [];
    let isFirst = activeZipTasks[fileId].length === 0;

    const downloadPromise = new Promise((resolve, reject) => {
        activeZipTasks[fileId].push({ resolve, reject, url, gameType, installId });
    });

    if (isFirst) {
        (async () => {
            const tempPath = path.join(app.getPath('temp'), `${fileId}.zip`);
            try {
                const agent = new https.Agent({ rejectUnauthorized: false });
                const res = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SporeNEXTLauncher'
                    },
                    agent
                });
                if (!res.ok) throw new Error('No se pudo descargar el mod: ' + res.status + ' ' + res.statusText);

                const total = Number(res.headers.get('content-length')) || 0;
                let downloaded = 0;
                const fileStream = fs.createWriteStream(tempPath);

                await new Promise((resProm, rejProm) => {
                    res.body.on('data', (chunk) => {
                        downloaded += chunk.length;
                        if (mainWindow && total) {
                            mainWindow.webContents.send('mod-download-progress', {
                                modId: (
                                    fileId === 'HDTextures' ? 'HDTextures' :
                                        fileId === '4gbpatch' ? '4gbpatch' :
                                            fileId === 'Unlock60fps' ? 'unlock60fps' :
                                                fileId
                                ),
                                gameType,
                                downloaded,
                                total,
                                percent: Math.round((downloaded / total) * 100),
                                installId: activeZipTasks[fileId][0]?.installId
                            });
                        }

                    });
                    res.body.pipe(fileStream);
                    fileStream.on('finish', () => {
                        if (mainWindow && total) {
                            for (const task of activeZipTasks[fileId]) {
                                mainWindow.webContents.send('mod-download-progress', {
                                    modId: (
                                        fileId === 'HDTextures' ? 'HDTextures' :
                                            fileId === '4gbpatch' ? '4gbpatch' :
                                                fileId === 'Unlock60fps' ? 'unlock60fps' :
                                                    fileId
                                    ),
                                    gameType,
                                    downloaded: total,
                                    total,
                                    percent: 100,
                                    installId: task.installId
                                });
                            }
                        }
                        resProm(tempPath);
                    });
                    fileStream.on('error', (err) => {
                        rejProm(err);
                    });
                });

                while (activeZipTasks[fileId].length > 0) {
                    const { resolve } = activeZipTasks[fileId][0];
                    resolve(tempPath);
                    activeZipTasks[fileId].shift();
                }
            } catch (err) {
                while (activeZipTasks[fileId].length > 0) {
                    const { reject } = activeZipTasks[fileId][0];
                    reject(err);
                    activeZipTasks[fileId].shift();
                }
            }
            delete activeZipTasks[fileId];
        })();
    }

    return downloadPromise;
});

function findAllPackages(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findAllPackages(filePath));
        } else if (file.toLowerCase().endsWith('.package')) {
            results.push(filePath);
        }
    }
    return results;
}

async function findSporeInstallations() {
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE', type: 'base' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE', type: 'base' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1', type: 'ga' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1', type: 'ga' }
    ];
    let installs = [];
    for (const reg of regKeys) {
        try {
            const regKey = new WinReg({ hive: reg.hive, key: reg.key });
            const datadir = await new Promise(resolve => {
                regKey.get('datadir', (err, item) => {
                    if (!err && item && item.value) resolve(item.value.replace(/"/g, ''));
                    else resolve(null);
                });
            });
            if (datadir && fs.existsSync(datadir)) {
                installs.push({ type: reg.type, datadir });
            }
        } catch { }
    }
    return installs;
}

ipcMain.handle('get-spore-installations', async () => {
    return await findSporeInstallations();
});

ipcMain.handle('has-spore-base', async () => {
    const installs = await findSporeInstallations();
    return installs.some(i => i.type === 'base');
});
ipcMain.handle('has-spore-ga', async () => {
    const installs = await findSporeInstallations();
    return installs.some(i => i.type === 'ga');
});

// --------- MODS: Install, Verify, Uninstall ---------

// HD Textures
ipcMain.handle('install-hdtextures', async (_e, extractedPath, zipPath, gameType, installId) =>
    withInstallLock(async () => {
        const installs = await findSporeInstallations();
        const install = installs.find(i => i.type === gameType);
        if (!install) throw new Error('No se encontró la instalación de Spore seleccionada.');

        let dataDir;
        if (gameType === 'ga') {
            if (install.datadir.toLowerCase().endsWith('dataep1')) {
                dataDir = install.datadir;
            } else {
                dataDir = path.join(path.dirname(install.datadir), 'DataEP1');
            }
        } else {
            if (install.datadir.toLowerCase().endsWith('data')) {
                dataDir = install.datadir;
            } else {
                dataDir = path.join(path.dirname(install.datadir), 'Data');
            }
        }

        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const files = findAllPackages(extractedPath);
        const total = files.length;
        let copied = 0;

        for (const src of files) {
            const dest = path.join(dataDir, path.basename(src));
            fs.copyFileSync(src, dest);
            copied++;
            if (mainWindow) {
                mainWindow.webContents.send('mod-install-progress', {
                    modId: 'HDTextures',
                    gameType,
                    copied,
                    total,
                    percent: Math.round((copied / total) * 100),
                    installId
                });
            }
        }

        try {
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            if (extractedPath && fs.existsSync(extractedPath)) fs.rmSync(extractedPath, { recursive: true, force: true });
        } catch (e) { }

        return true;
    })
);

ipcMain.handle('is-hdtextures-installed', async (_e, gameType) => {
    const installs = await findSporeInstallations();
    const install = installs.find(i => i.type === gameType);
    if (!install) return false;
    let dataDir;
    if (gameType === 'ga') {
        dataDir = install.datadir.toLowerCase().endsWith('dataep1')
            ? install.datadir
            : path.join(path.dirname(install.datadir), 'DataEP1');
    } else {
        dataDir = install.datadir.toLowerCase().endsWith('data')
            ? install.datadir
            : path.join(path.dirname(install.datadir), 'Data');
    }
    const files = [
        'MOD_HD_Water.package',
        'MOD_HD_Textures3.package',
        'MOD_HD_Textures2.package',
        'MOD_HD_Textures1.package',
        'MOD_HD_Planet-textures.package',
        'MOD_HD_Parts.package',
        'MOD_HD_Particles.package',
        'MOD_HD_Meshes2.package',
        'MOD_HD_Meshes.package',
        'MOD_HD_LOD-High.package',
        'MOD_HD_Ground.package',
        'MOD_HD_Galaxy.package',
        'MOD_HD_Empire-backgrounds.package',
        'MOD_HD_Editor-background.package',
        'MOD_HD_Decals.package',
        'MOD_HD_Background.package'
    ];
    return files.every(file => fs.existsSync(path.join(dataDir, file)));
});

ipcMain.handle('uninstall-hdtextures', async (_e, gameType) => {
    const installs = await findSporeInstallations();
    const install = installs.find(i => i.type === gameType);
    if (!install) return false;
    let dataDir;
    if (gameType === 'ga') {
        dataDir = install.datadir.toLowerCase().endsWith('dataep1')
            ? install.datadir
            : path.join(path.dirname(install.datadir), 'DataEP1');
    } else {
        dataDir = install.datadir.toLowerCase().endsWith('data')
            ? install.datadir
            : path.join(path.dirname(install.datadir), 'Data');
    }
    const files = [
        'MOD_HD_Water.package',
        'MOD_HD_Textures3.package',
        'MOD_HD_Textures2.package',
        'MOD_HD_Textures1.package',
        'MOD_HD_Planet-textures.package',
        'MOD_HD_Parts.package',
        'MOD_HD_Particles.package',
        'MOD_HD_Meshes2.package',
        'MOD_HD_Meshes.package',
        'MOD_HD_LOD-High.package',
        'MOD_HD_Ground.package',
        'MOD_HD_Galaxy.package',
        'MOD_HD_Empire-backgrounds.package',
        'MOD_HD_Editor-background.package',
        'MOD_HD_Decals.package',
        'MOD_HD_Background.package'
    ];
    let removed = false;
    for (const file of files) {
        const filePath = path.join(dataDir, file);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                removed = true;
            }
        } catch (err) { }
    }
    return removed;
});

// 4GB Patch
ipcMain.handle('install-4gbpatch', async (_e, extractedPath, zipPath, gameType) =>
    withInstallLock(async () => {
        const installs = await findSporeInstallations();
        const install = installs.find(i => i.type === gameType);
        if (!install) throw new Error('No se encontró la instalación de Spore seleccionada.');

        let binDir;
        if (gameType === 'ga') {
            binDir = path.join(path.dirname(install.datadir), 'SporebinEP1');
        } else {
            binDir = path.join(path.dirname(install.datadir), 'Sporebin');
        }
        if (!fs.existsSync(binDir)) throw new Error('No se encontró la carpeta Sporebin.');

        const originalExe = path.join(binDir, 'SporeApp.exe');
        const backupExe = path.join(binDir, 'SporeApp-backup.exe');

        if (fs.existsSync(originalExe) && !fs.existsSync(backupExe)) {
            fs.copyFileSync(originalExe, backupExe);
        }

        const patchExe = fs.readdirSync(extractedPath).find(f => f.toLowerCase() === 'sporeapp.exe');
        if (!patchExe) throw new Error('No se encontró SporeApp.exe en el parche.');
        const patchExePath = path.join(extractedPath, patchExe);

        fs.copyFileSync(patchExePath, originalExe);

        if (mainWindow) {
            mainWindow.webContents.send('mod-install-progress', {
                modId: '4gbpatch',
                gameType,
                copied: 1,
                total: 1,
                percent: 100
            });
        }

        try {
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            if (extractedPath && fs.existsSync(extractedPath)) fs.rmSync(extractedPath, { recursive: true, force: true });
        } catch { }

        return true;
    })
);


function fileHash(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

ipcMain.handle('is-4gbpatch-installed', async (_e, gameType) => {
    const installs = await findSporeInstallations();
    const install = installs.find(i => i.type === gameType);
    if (!install) return false;
    let binDir;
    if (gameType === 'ga') {
        binDir = path.join(path.dirname(install.datadir), 'SporebinEP1');
    } else {
        binDir = path.join(path.dirname(install.datadir), 'Sporebin');
    }
    const originalExe = path.join(binDir, 'SporeApp.exe');
    const backupExe = path.join(binDir, 'SporeApp-backup.exe');
    if (!fs.existsSync(backupExe) || !fs.existsSync(originalExe)) return false;
    return fileHash(originalExe) !== fileHash(backupExe);
});

ipcMain.handle('uninstall-4gbpatch', async (_e, gameType) => {
    const installs = await findSporeInstallations();
    const install = installs.find(i => i.type === gameType);
    if (!install) return false;
    let binDir;
    if (gameType === 'ga') {
        binDir = path.join(path.dirname(install.datadir), 'SporebinEP1');
    } else {
        binDir = path.join(path.dirname(install.datadir), 'Sporebin');
    }
    const originalExe = path.join(binDir, 'SporeApp.exe');
    const backupExe = path.join(binDir, 'SporeApp-backup.exe');
    try {
        if (fs.existsSync(originalExe)) fs.unlinkSync(originalExe);
        if (fs.existsSync(backupExe)) {
            fs.renameSync(backupExe, originalExe);
            return true;
        }
    } catch { }
    return false;
});

// 60FPS Unlocker
ipcMain.handle('install-sporemod', async (_e, extractedPath, zipPath, gameType) =>
    withInstallLock(async () => {
        const installs = await findSporeInstallations();
        const install = installs.find(i => i.type === gameType);
        if (!install) throw new Error('No se encontró la instalación de Spore seleccionada.');

        let configDir;
        if (gameType === 'ga') {
            configDir = path.join(path.dirname(install.datadir), 'DataEP1', 'Config');
        } else {
            configDir = path.join(path.dirname(install.datadir), 'Data', 'Config');
        }
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

        const files = fs.readdirSync(extractedPath);
        const total = files.length;
        let copied = 0;

        for (const file of files) {
            const src = path.join(extractedPath, file);
            const dest = path.join(configDir, file);
            if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dest);
                copied++;
                if (mainWindow) {
                    mainWindow.webContents.send('mod-install-progress', {
                        modId: 'unlock60fps',
                        gameType,
                        copied,
                        total,
                        percent: Math.round((copied / total) * 100)
                    });
                }
            }
        }

        try {
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            if (extractedPath && fs.existsSync(extractedPath)) fs.rmSync(extractedPath, { recursive: true, force: true });
        } catch (e) { }

        return true;
    })
);

ipcMain.handle('is-unlock60fps-installed', async (_e, gameType) => {
    const installs = await findSporeInstallations();
    const install = installs.find(i => i.type === gameType);
    if (!install) return false;
    let configDir;
    if (gameType === 'ga') {
        configDir = path.join(path.dirname(install.datadir), 'DataEP1', 'Config');
    } else {
        configDir = path.join(path.dirname(install.datadir), 'Data', 'Config');
    }
    const configManager = path.join(configDir, 'ConfigManager.txt');
    const properties = path.join(configDir, 'Properties.txt');
    return fs.existsSync(configManager) && fs.existsSync(properties);
});

ipcMain.handle('uninstall-unlock60fps', async (_e, gameType) => {
    const installs = await findSporeInstallations();
    const install = installs.find(i => i.type === gameType);
    if (!install) return false;
    let configDir;
    if (gameType === 'ga') {
        configDir = path.join(path.dirname(install.datadir), 'DataEP1', 'Config');
    } else {
        configDir = path.join(path.dirname(install.datadir), 'Data', 'Config');
    }
    const files = ['ConfigManager.txt', 'Properties.txt'];
    let removed = false;
    for (const file of files) {
        const filePath = path.join(configDir, file);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                removed = true;
            }
        } catch (err) { }
    }
    return removed;
});

// --------- UNZIP ---------

ipcMain.handle('unzip-mod', async (_e, zipPath) => {
    const extractPath = zipPath.replace(/\.zip$/i, '');
    return await new Promise((resolve, reject) => {
        const child = fork(path.join(__dirname, 'unzip-child.js'), [zipPath, extractPath], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
        child.on('message', (msg) => {
            if (msg.success) {
                resolve(extractPath);
            } else {
                reject(new Error(msg.error || 'Error al descomprimir'));
            }
        });
        child.on('error', (err) => reject(err));
        child.on('exit', (code) => {
            if (code !== 0) reject(new Error('Error al descomprimir (exit code ' + code + ')'));
        });
    });
});

ipcMain.handle('unzip-mod-to', async (_e, zipPath, extractPath) => {
    return await new Promise((resolve, reject) => {
        const child = fork(path.join(__dirname, 'unzip-child.js'), [zipPath, extractPath], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
        child.on('message', (msg) => {
            if (msg.progress !== undefined && mainWindow) {
                mainWindow.webContents.send('mod-unzip-progress', {
                    zipPath,
                    extractPath,
                    percent: msg.progress
                });
            }
            if (msg.success) {
                resolve(extractPath);
            } else if (msg.error) {
                reject(new Error(msg.error || 'Error al descomprimir'));
            }
        });
        child.on('error', (err) => reject(err));
        child.on('exit', (code) => {
            if (code !== 0) reject(new Error('Error al descomprimir (exit code ' + code + ')'));
        });
    });
});

// --------- LAUNCH SPORE ---------

async function findSporeBaseExe() {
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE' }
    ];
    for (const reg of regKeys) {
        try {
            const regKey = new WinReg({ hive: reg.hive, key: reg.key });
            const datadir = await new Promise(resolve => {
                regKey.get('datadir', (err, item) => {
                    if (!err && item && item.value) resolve(item.value.replace(/"/g, ''));
                    else resolve(null);
                });
            });
            if (datadir) {
                const baseDir = datadir.replace(/\\Data\\?$/i, '');
                const exePath = path.join(baseDir, 'Sporebin', 'SporeApp.exe');
                if (fs.existsSync(exePath)) return exePath;
            }
        } catch { }
    }
    return null;
}

ipcMain.handle('launch-spore-base', async () => {
    try {
        exec('start steam://run/17390');
        return true;
    } catch (e) {
        return false;
    }
});


ipcMain.handle('launch-spore-modapi', async () => {
    const modapiPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Spore ModAPI', 'Spore ModAPI Launcher.exe');
    try {
        spawn('explorer.exe', [modapiPath], { detached: true, stdio: 'ignore' }).unref();
        return true;
    } catch (e) {
        return false;
    }
});


// --------- SINGLE INSTALLATION ---------

let isAnyModInstalling = false;

async function withInstallLock(fn) {
    if (isAnyModInstalling) {
        throw new Error('There is already a mod installation in progress. Please wait until it finishes.');
    }
    isAnyModInstalling = true;
    try {
        const result = await fn();
        return result;
    } finally {
        isAnyModInstalling = false;
    }
}


// --------- UNINSTALL ALL MODS ---------

ipcMain.handle('uninstall-all-mods', async () => {
    try {
        let removedAny = false;
        const installs = await findSporeInstallations();

        // --------- HD Textures, 60fps, 4GB Patch ---------
        for (const install of installs) {
            // HD Textures
            let dataDir;
            if (install.type === 'ga') {
                dataDir = install.datadir.toLowerCase().endsWith('dataep1')
                    ? install.datadir
                    : path.join(path.dirname(install.datadir), 'DataEP1');
            } else {
                dataDir = install.datadir.toLowerCase().endsWith('data')
                    ? install.datadir
                    : path.join(path.dirname(install.datadir), 'Data');
            }
            const hdFiles = [
                'MOD_HD_Water.package',
                'MOD_HD_Textures3.package',
                'MOD_HD_Textures2.package',
                'MOD_HD_Textures1.package',
                'MOD_HD_Planet-textures.package',
                'MOD_HD_Parts.package',
                'MOD_HD_Particles.package',
                'MOD_HD_Meshes2.package',
                'MOD_HD_Meshes.package',
                'MOD_HD_LOD-High.package',
                'MOD_HD_Ground.package',
                'MOD_HD_Galaxy.package',
                'MOD_HD_Empire-backgrounds.package',
                'MOD_HD_Editor-background.package',
                'MOD_HD_Decals.package',
                'MOD_HD_Background.package'
            ];
            for (const file of hdFiles) {
                const filePath = path.join(dataDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    removedAny = true;
                }
            }
            // 60fps unlocker
            let configDir;
            if (install.type === 'ga') {
                configDir = path.join(path.dirname(install.datadir), 'DataEP1', 'Config');
            } else {
                configDir = path.join(path.dirname(install.datadir), 'Data', 'Config');
            }
            const unlockerFiles = ['ConfigManager.txt', 'Properties.txt'];
            for (const file of unlockerFiles) {
                const filePath = path.join(configDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    removedAny = true;
                }
            }
            // 4GB Patch
            let binDir;
            if (install.type === 'ga') {
                binDir = path.join(path.dirname(install.datadir), 'SporebinEP1');
            } else {
                binDir = path.join(path.dirname(install.datadir), 'Sporebin');
            }
            const originalExe = path.join(binDir, 'SporeApp.exe');
            const backupExe = path.join(binDir, 'SporeApp-backup.exe');
            try {
                if (
                    fs.existsSync(originalExe) &&
                    fs.existsSync(backupExe) &&
                    fileHash(originalExe) !== fileHash(backupExe)
                ) {
                    fs.unlinkSync(originalExe);
                    fs.renameSync(backupExe, originalExe);
                    removedAny = true;
                }
            } catch { }
        }

        // --------- SporeModAPI Mods ---------
        const modsJsonPath = app.isPackaged
            ? path.join(process.resourcesPath, 'resources', 'ModsInstallation', 'mods.json')
            : path.join(__dirname, '../../resources/ModsInstallation/mods.json');
        const modsList = JSON.parse(fs.readFileSync(modsJsonPath, 'utf8'));

        const mLibsPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'mLibs');
        if (fs.existsSync(mLibsPath)) {
            const files = fs.readdirSync(mLibsPath);
            for (const mod of modsList) {
                if (!mod.dll) continue;
                const baseName = mod.dll;
                files.forEach(f => {
                    if (f.startsWith(baseName)) {
                        try {
                            fs.unlinkSync(path.join(mLibsPath, f));
                            removedAny = true;
                        } catch (err) { }
                    }
                });
            }
        }

        for (const mod of modsList) {
            if (!mod.package) continue;
            for (const install of installs) {
                let dataDir = null;
                if (install.type === 'ga') {
                    dataDir = install.datadir.toLowerCase().endsWith('dataep1')
                        ? install.datadir
                        : path.join(path.dirname(install.datadir), 'DataEP1');
                }
                if (dataDir) {
                    const packagePath = path.join(dataDir, mod.package);
                    if (fs.existsSync(packagePath)) {
                        try {
                            fs.unlinkSync(packagePath);
                            removedAny = true;
                        } catch (err) { }
                    }
                }
            }
        }

        const modConfigsPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'ModConfigs');
        if (fs.existsSync(modConfigsPath)) {
            fs.rmSync(modConfigsPath, { recursive: true, force: true });
            removedAny = true;
        }

        const installedModsConfigPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'InstalledMods.config');
        if (fs.existsSync(installedModsConfigPath)) {
            try {
                const builder = new Builder();
                const newXml = builder.buildObject({ InstalledMods: {} });
                fs.writeFileSync(installedModsConfigPath, newXml, 'utf8');
            } catch (err) { }
        }

        const modsPath = path.join(app.getPath('userData'), 'mods');
        if (fs.existsSync(modsPath)) {
            fs.rmSync(modsPath, { recursive: true, force: true });
            removedAny = true;
        }
        return removedAny;
    } catch (err) {
        return false;
    }
});


// Spore ModAPI

function getModById(modId) {
    const modsJsonPath = app.isPackaged
        ? path.join(process.resourcesPath, 'resources', 'ModsInstallation', 'mods.json')
        : path.join(__dirname, '../../resources/ModsInstallation/mods.json');
    const modsList = JSON.parse(fs.readFileSync(modsJsonPath, 'utf8'));
    return modsList.find(mod => mod.id === modId);
}
function findSporemodFile(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file.endsWith('.sporemod')) return fullPath;
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findSporemodFile(fullPath);
            if (found) return found;
        }
    }
    return null;
}

ipcMain.handle('install-sporemodapi-mod', async (_e, modId, extractedPath, zipPath, gameType) =>
    withInstallLock(async () => {
        const mod = getModById(modId);
        if (!mod) throw new Error('Mod no encontrado');

        const sporemodPath = findSporemodFile(extractedPath);
        if (!sporemodPath) throw new Error('No se encontró el archivo .sporemod en el paquete');

        let installerPath;
        if (app.isPackaged) {
            installerPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'SporeModAPI', 'Spore ModAPI Easy Installer.exe');
        } else {
            installerPath = path.join(__dirname, '../../resources/SporeModAPI/Spore ModAPI Easy Installer.exe');
        }

        const appdataSporeModAPI = path.join(process.env.APPDATA, 'Spore ModAPI');
        if (!fs.existsSync(appdataSporeModAPI)) {
            fs.mkdirSync(appdataSporeModAPI, { recursive: true });
        }

        const tempInstaller = path.join(appdataSporeModAPI, 'Spore ModAPI Easy Installer.exe');
        const tempMod = path.join(appdataSporeModAPI, path.basename(sporemodPath));

        try {
            if (fs.existsSync(tempInstaller)) {
                try { fs.unlinkSync(tempInstaller); } catch (err) { }
            }
            fs.copyFileSync(installerPath, tempInstaller);
            fs.copyFileSync(sporemodPath, tempMod);
        } catch (err) {
            throw err;
        }

        const installResult = await new Promise((resolve, reject) => {
            const child = spawn(tempInstaller, [
                '/SILENT',
                '/VERYSILENT',
                tempMod
            ], { cwd: appdataSporeModAPI, detached: false, stdio: 'inherit', shell: false });

            let tempModDeleted = false;
            function cleanupTempMod() {
                if (!tempModDeleted && fs.existsSync(tempMod)) {
                    try { fs.unlinkSync(tempMod); } catch (err) { }
                    tempModDeleted = true;
                }
            }

            child.on('error', (err) => {
                cleanupTempMod();
                reject(err);
            });
            child.on('exit', (_code) => {
                cleanupTempMod();
                resolve(_code === 0);
            });
        });

        try {
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            if (extractedPath && fs.existsSync(extractedPath)) fs.rmSync(extractedPath, { recursive: true, force: true });
        } catch (err) { }

        return installResult;
    })
);

ipcMain.handle('is-sporemodapi-mod-installed', async (_e, modId) => {
    const mod = getModById(modId);
    if (!mod) return false;
    const installedModsConfigPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'InstalledMods.config');
    if (!fs.existsSync(installedModsConfigPath)) return false;
    try {
        const xml = fs.readFileSync(installedModsConfigPath, 'utf8');
        const obj = await parseStringPromise(xml);
        if (obj && obj.InstalledMods && obj.InstalledMods.mod) {
            return obj.InstalledMods.mod.some(m =>
                (m.$ && (m.$.name === mod.id || m.$.unique === mod.id || m.$.displayName === mod.id)) ||
                (m.file && m.file.some(f => {
                    if (!f) return false;
                    const fileName = typeof f === 'string' ? f : (f._ || '');
                    return (
                        (mod.dll && fileName.trim().toLowerCase() === mod.dll.trim().toLowerCase()) ||
                        (mod.package && fileName.trim().toLowerCase() === mod.package.trim().toLowerCase())
                    );
                }))
            );
        }
    } catch (err) { }
    return false;
});


ipcMain.handle('uninstall-sporemodapi-mod', async (_e, modId) => {
    const mod = getModById(modId);
    if (!mod) {
        return false;
    }
    const mLibsPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'mLibs');
    let removedAny = false;
    const modFiles = [];
    if (mod.dll) modFiles.push(mod.dll);
    if (mod.package) modFiles.push(mod.package);

    if (fs.existsSync(mLibsPath)) {
        const files = fs.readdirSync(mLibsPath);
        if (mod.dll) {
            const baseName = mod.dll;
            files.forEach(f => {
                if (f.startsWith(baseName)) {
                    try {
                        fs.unlinkSync(path.join(mLibsPath, f));
                        removedAny = true;
                    } catch (err) { }
                }
            });
        }
    }

    if (mod.package) {
        const installs = await findSporeInstallations();
        for (const install of installs) {
            let dataDir = null;
            if (install.type === 'ga') {
                dataDir = install.datadir.toLowerCase().endsWith('dataep1')
                    ? install.datadir
                    : path.join(path.dirname(install.datadir), 'DataEP1');
            }
            if (dataDir) {
                const packagePath = path.join(dataDir, mod.package);
                if (fs.existsSync(packagePath)) {
                    try {
                        fs.unlinkSync(packagePath);
                        removedAny = true;
                    } catch (err) { }
                }
            }
        }
    }

    const installedModsConfigPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'InstalledMods.config');
    if (fs.existsSync(installedModsConfigPath)) {
        try {
            const xml = fs.readFileSync(installedModsConfigPath, 'utf8');
            const obj = await parseStringPromise(xml);
            if (obj && obj.InstalledMods && obj.InstalledMods.mod) {
                obj.InstalledMods.mod = obj.InstalledMods.mod.filter(m =>
                    !(
                        (m.file && m.file.some(f => {
                            if (!f) return false;
                            const fileName = typeof f === 'string' ? f : (f._ || '');
                            return modFiles.some(file => fileName.trim().toLowerCase() === file.trim().toLowerCase());
                        }))
                        ||
                        (m.$ && (m.$.name === mod.id || m.$.unique === mod.id || m.$.displayName === mod.id))
                    )
                );
                const builder = new Builder();
                const newXml = builder.buildObject(obj.InstalledMods.mod.length === 0 ? { InstalledMods: {} } : obj);
                fs.writeFileSync(installedModsConfigPath, newXml, 'utf8');
            }
        } catch (err) { }
    }

    if (mod.dll) {
        const modName = mod.dll.replace(/\.dll$/i, '');
        const modConfigsPath = path.join(process.env.APPDATA, 'Spore ModAPI', 'ModConfigs', modName);
        if (fs.existsSync(modConfigsPath)) {
            try {
                fs.rmSync(modConfigsPath, { recursive: true, force: true });
            } catch (err) { }
        }
    }

    return removedAny;
});