import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import pkg from 'electron-updater';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import WinReg from 'winreg';
import https from 'https';
import { fork, spawn } from 'child_process';

app.disableHardwareAcceleration();
app.setName('Spore NEXT');

const { autoUpdater } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            nodeIntegration: false
        },
        transparent: true,
        backgroundColor: '#00000000',
    });
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

    mainWindow.webContents.on('did-finish-load', () => {
    });

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

ipcMain.handle('download-mod-with-progress', async (_event, url) => {
    try {
        const urlObj = new URL(url);
        let fileId = urlObj.searchParams.get('id');
        if (!fileId) {
            fileId = path.basename(urlObj.pathname, '.zip');
        }
        const tempPath = path.join(app.getPath('temp'), `${fileId}.zip`);
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

        const modId = fileId;

        return await new Promise((resolve, reject) => {
            res.body.on('data', (chunk) => {
                downloaded += chunk.length;
                if (mainWindow && total) {
                    mainWindow.webContents.send('mod-download-progress', {
                        modId,
                        downloaded,
                        total,
                        percent: Math.round((downloaded / total) * 100)
                    });
                }
            });
            res.body.pipe(fileStream);
            fileStream.on('finish', () => {
                if (mainWindow && total) {
                    mainWindow.webContents.send('mod-download-progress', {
                        modId,
                        downloaded: total,
                        total,
                        percent: 100
                    });
                }
                resolve(tempPath);
            });
            fileStream.on('error', (err) => {
                reject(err);
            });
        });
    } catch (err) {
        if (mainWindow) {
            mainWindow.webContents.send('download-mod-error', err.message || String(err));
        }
        throw err;
    }
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


ipcMain.handle('install-hdtextures', async (_e, extractedPath, zipPath) => {
    let configDir = await findSporeConfigDir();
    if (!configDir) throw new Error('No se pudo encontrar la carpeta de configuración de Spore.');


    let configDirNormalized = configDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    let dataEP1;
    if (configDirNormalized.endsWith('/dataep1')) {
        dataEP1 = configDir;
    } else if (configDirNormalized.endsWith('/config')) {
        dataEP1 = path.dirname(configDir);
    } else {
        const candidate = path.join(configDir, 'DataEP1');
        if (fs.existsSync(candidate)) {
            dataEP1 = candidate;
        } else {
            throw new Error('No se pudo encontrar la carpeta DataEP1.');
        }
    }

    if (!fs.existsSync(dataEP1)) fs.mkdirSync(dataEP1, { recursive: true });


    const files = findAllPackages(extractedPath);
    const total = files.length;
    let copied = 0;

    for (const src of files) {
        const dest = path.join(dataEP1, path.basename(src));
        fs.copyFileSync(src, dest);
        copied++;
        if (mainWindow) {
            mainWindow.webContents.send('mod-install-progress', {
                modId: 'HDTextures',
                copied,
                total,
                percent: Math.round((copied / total) * 100)
            });
        }
    }

    try {
        if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        if (extractedPath && fs.existsSync(extractedPath)) fs.rmSync(extractedPath, { recursive: true, force: true });
    } catch (e) { }

    return true;
});

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

async function findSporeExe() {
    const WinReg = (await import('winreg')).default;
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1' }
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
                const baseDir = datadir.replace(/\\DataEP1\\?$/i, '');
                const exePath = path.join(baseDir, 'SporebinEP1', 'SporeApp.exe');
                if (fs.existsSync(exePath)) return exePath;
            }
        } catch { }
    }
    return null;
}

ipcMain.handle('launch-spore', async () => {
    const exePath = await findSporeExe();
    if (!exePath) return false;
    try {
        spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
        return true;
    } catch (e) {
        return false;
    }
});

async function findSporeConfigDir() {
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1' }
    ];
    for (const reg of regKeys) {
        try {
            const regKey = new WinReg({
                hive: reg.hive,
                key: reg.key
            });
            const getVal = (name) => new Promise((resolve) => {
                regKey.get(name, (err, item) => {
                    if (err || !item) return resolve(null);
                    resolve(item.value.replace(/"/g, ''));
                });
            });
            const values = await Promise.all([getVal('datadir'), getVal('InstallLoc'), getVal('Install Dir')]);
            const [datadir, installLoc, installDir] = values;
            if (datadir && fs.existsSync(datadir)) {
                return datadir;
            }
            const basePath = installLoc || installDir;
            if (basePath) {
                const configPath = path.join(basePath, 'DataEP1', 'Config');
                if (fs.existsSync(configPath)) {
                    return configPath;
                }
            }
        } catch (e) {
        }
    }
    return null;
}


function fileHash(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}


ipcMain.handle('install-4gbpatch', async (_e, extractedPath, zipPath) => {
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1' }
    ];
    let installDir = null;
    for (const reg of regKeys) {
        try {
            const regKey = new WinReg({ hive: reg.hive, key: reg.key });
            installDir = await new Promise(resolve => {
                regKey.get('datadir', (err, item) => {
                    if (!err && item && fs.existsSync(path.dirname(item.value))) {
                        return resolve(path.dirname(item.value));
                    }
                    regKey.get('Install Dir', (err2, item2) => {
                        if (!err2 && item2 && fs.existsSync(item2.value)) {
                            return resolve(item2.value.replace(/"/g, ''));
                        }
                        resolve(null);
                    });
                });
            });
            if (installDir && fs.existsSync(installDir)) break;
        } catch { }
    }
    if (!installDir) throw new Error('No se pudo encontrar la carpeta de instalación de Spore.');

    const sporebinEP1 = path.join(installDir, 'SporebinEP1');
    if (!fs.existsSync(sporebinEP1)) throw new Error('No se encontró la carpeta SporebinEP1.');

    const originalExe = path.join(sporebinEP1, 'SporeApp.exe');
    const backupExe = path.join(sporebinEP1, 'SporeApp-backup.exe');

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
});


ipcMain.handle('uninstall-4gbpatch', async () => {
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1' }
    ];
    let installDir = null;
    for (const reg of regKeys) {
        try {
            const regKey = new WinReg({ hive: reg.hive, key: reg.key });
            installDir = await new Promise(resolve => {
                regKey.get('datadir', (err, item) => {
                    if (!err && item && fs.existsSync(path.dirname(item.value))) {
                        return resolve(path.dirname(item.value));
                    }
                    regKey.get('Install Dir', (err2, item2) => {
                        if (!err2 && item2 && fs.existsSync(item2.value)) {
                            return resolve(item2.value.replace(/"/g, ''));
                        }
                        resolve(null);
                    });
                });
            });
            if (installDir && fs.existsSync(installDir)) break;
        } catch { }
    }
    if (!installDir) return false;
    const sporebinEP1 = path.join(installDir, 'SporebinEP1');
    const originalExe = path.join(sporebinEP1, 'SporeApp.exe');
    const backupExe = path.join(sporebinEP1, 'SporeApp-backup.exe');

    try {
        if (fs.existsSync(originalExe)) fs.unlinkSync(originalExe);
        if (fs.existsSync(backupExe)) {
            fs.renameSync(backupExe, originalExe);
            return true;
        }
    } catch { }
    return false;
});

ipcMain.handle('is-4gbpatch-installed', async () => {
    const regKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1' }
    ];
    let installDir = null;
    for (const reg of regKeys) {
        try {
            const regKey = new WinReg({ hive: reg.hive, key: reg.key });
            installDir = await new Promise(resolve => {
                regKey.get('datadir', (err, item) => {
                    if (!err && item && fs.existsSync(path.dirname(item.value))) {
                        return resolve(path.dirname(item.value));
                    }
                    regKey.get('Install Dir', (err2, item2) => {
                        if (!err2 && item2 && fs.existsSync(item2.value)) {
                            return resolve(item2.value.replace(/"/g, ''));
                        }
                        resolve(null);
                    });
                });
            });
            if (installDir && fs.existsSync(installDir)) break;
        } catch { }
    }
    if (!installDir) return false;
    const sporebinEP1 = path.join(installDir, 'SporebinEP1');
    const originalExe = path.join(sporebinEP1, 'SporeApp.exe');
    const backupExe = path.join(sporebinEP1, 'SporeApp-backup.exe');
    if (!fs.existsSync(backupExe) || !fs.existsSync(originalExe)) return false;


    return fileHash(originalExe) !== fileHash(backupExe);
});

ipcMain.handle('install-sporemod', async (_e, extractedPath, zipPath) => {
    let configDir = await findSporeConfigDir();
    if (!configDir) throw new Error('No se pudo encontrar la carpeta de configuración de Spore.');

    if (!configDir.toLowerCase().endsWith('config')) {
        configDir = path.join(configDir, 'Config');
    }
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

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
                    copied,
                    total,
                    percent: Math.round((copied / total) * 100)
                });
            }
        }
    }

    try {
        if (zipPath && fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
        if (extractedPath && fs.existsSync(extractedPath)) {
            fs.rmSync(extractedPath, { recursive: true, force: true });
        }
    } catch (e) {
    }

    return true;
});

ipcMain.handle('is-unlock60fps-installed', async () => {
    let configDir = await findSporeConfigDir();
    if (!configDir) return false;
    if (!configDir.toLowerCase().endsWith('config')) {
        configDir = path.join(configDir, 'Config');
    }
    const configManager = path.join(configDir, 'ConfigManager.txt');
    const properties = path.join(configDir, 'Properties.txt');
    return fs.existsSync(configManager) && fs.existsSync(properties);
});

ipcMain.handle('uninstall-unlock60fps', async () => {
    let configDir = await findSporeConfigDir();
    if (!configDir) return false;
    if (!configDir.toLowerCase().endsWith('config')) {
        configDir = path.join(configDir, 'Config');
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
        } catch (err) {
        }
    }

    return removed;
});


ipcMain.handle('is-hdtextures-installed', async () => {
    let configDir = await findSporeConfigDir();
    if (!configDir) return false;

    let configDirNormalized = configDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    let dataEP1;
    if (configDirNormalized.endsWith('/config')) {
        dataEP1 = path.dirname(configDir);
    } else if (configDirNormalized.endsWith('/dataep1')) {
        dataEP1 = configDir;
    } else {
        const candidate = path.join(configDir, 'DataEP1');
        if (fs.existsSync(candidate)) {
            dataEP1 = candidate;
        } else {
            return false;
        }
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

    return files.every(file => fs.existsSync(path.join(dataEP1, file)));
});


ipcMain.handle('uninstall-hdtextures', async () => {
    let configDir = await findSporeConfigDir();
    if (!configDir) return false;

    let configDirNormalized = configDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    let dataEP1;
    if (configDirNormalized.endsWith('/config')) {
        dataEP1 = path.dirname(configDir);
    } else if (configDirNormalized.endsWith('/dataep1')) {
        dataEP1 = configDir;
    } else {
        const candidate = path.join(configDir, 'DataEP1');
        if (fs.existsSync(candidate)) {
            dataEP1 = candidate;
        } else {
            return false;
        }
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
        const filePath = path.join(dataEP1, file);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                removed = true;
            }
        } catch (err) { }
    }
    return removed;
});

ipcMain.handle('uninstall-all-mods', async () => {
    try {
        let removedAny = false;
        const modsPath = path.join(app.getPath('userData'), 'mods');
        if (fs.existsSync(modsPath)) {
            fs.rmSync(modsPath, { recursive: true, force: true });
            removedAny = true;
        }

        const configDir = await findSporeConfigDir();
        if (configDir) {
            const hdPackages = [
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
            let dataEP1;
            if (configDir.toLowerCase().endsWith('dataep1')) {
                dataEP1 = configDir;
            } else if (configDir.toLowerCase().endsWith('config')) {
                dataEP1 = path.dirname(configDir);
            } else {
                dataEP1 = path.join(path.dirname(configDir), 'DataEP1');
            }
            if (fs.existsSync(dataEP1)) {
                hdPackages.forEach(file => {
                    const filePath = path.join(dataEP1, file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        removedAny = true;
                    }
                });
            }

            const configPath = configDir.toLowerCase().endsWith('config') ? configDir : path.join(configDir, 'Config');
            if (fs.existsSync(configPath)) {
                ['ConfigManager.txt', 'Properties.txt'].forEach(file => {
                    const filePath = path.join(configPath, file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        removedAny = true;
                    }
                });
            }

            const regKeys = [
                { hive: WinReg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\Electronic Arts\\SPORE_EP1' },
                { hive: WinReg.HKLM, key: '\\SOFTWARE\\Electronic Arts\\SPORE_EP1' }
            ];
            let installDir = null;
            for (const reg of regKeys) {
                try {
                    const regKey = new WinReg({ hive: reg.hive, key: reg.key });
                    installDir = await new Promise(resolve => {
                        regKey.get('datadir', (err, item) => {
                            if (!err && item && fs.existsSync(path.dirname(item.value))) {
                                return resolve(path.dirname(item.value));
                            }
                            regKey.get('Install Dir', (err2, item2) => {
                                if (!err2 && item2 && fs.existsSync(item2.value)) {
                                    return resolve(item2.value.replace(/"/g, ''));
                                }
                                resolve(null);
                            });
                        });
                    });
                    if (installDir && fs.existsSync(installDir)) break;
                } catch { }
            }
            if (installDir) {
                const sporebinEP1 = path.join(installDir, 'SporebinEP1');
                const originalExe = path.join(sporebinEP1, 'SporeApp.exe');
                const backupExe = path.join(sporebinEP1, 'SporeApp-backup.exe');
                try {
                    if (fs.existsSync(originalExe)) {
                        fs.unlinkSync(originalExe);
                        removedAny = true;
                    }
                    if (fs.existsSync(backupExe)) {
                        fs.renameSync(backupExe, originalExe);
                        removedAny = true;
                    }
                } catch { }
            }
        }
        return removedAny;
    } catch (err) {
        return false;
    }
});