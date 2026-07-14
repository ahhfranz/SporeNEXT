const { exec, spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  queryRegistry,
  getSporeAppVersion,
  findExecutable,
  findFallbackExecutable
} = require('./registryUtils.cjs');

const {
  extractZip,
  extractImagesFromZip,
  readXmlFromZip
} = require('./zipUtils.cjs');

let managerQueue = Promise.resolve();

const getNormalizedBase = (fname) => {
  if (!fname) return '';
  return fname
    .replace(/\.(sporemod|zip|package|dll)$/i, '')
    .replace(/^!+/, '')
    .replace(/^[zZ]+(?=[A-Z])/, '')
    .toLowerCase()
    .replace(/[-_]v?\d+(\.\d+)*$/i, '')
    .replace(/v?\d+(\.\d+)+$/i, '')
    .replace(/[-_\.]/g, '')
    .replace(/\s+/g, '')
    .trim();
};

const decodeXmlEntities = (str) => {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(Number(dec)));
};

function enqueue(operation, delayMs = 0) {
  const result = managerQueue.then(async () => {
    const res = await operation();
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return res;
  });
  managerQueue = result.catch(async () => {
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  });
  return result;
}

async function _listInstalledModsRawInternal(launcher) {
  try {
    const managerExe = await launcher.getManagerExePath();

    const xmlPath = path.join(path.dirname(managerExe), 'SporeModManager.xml');
    if (fs.existsSync(xmlPath)) {
      let xmlContent = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const rawContent = fs.readFileSync(xmlPath, 'utf8');
          const trimmed = rawContent.trim();
          if (trimmed.startsWith('<SporeModManager>') && trimmed.endsWith('</SporeModManager>')) {
            xmlContent = trimmed;
            break;
          }
        } catch (e) {
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (xmlContent) {
        try {
          const mods = [];
          const modBlocks = xmlContent.split('</InstalledSporeMod>');

          for (let i = 0; i < modBlocks.length - 1; i++) {
            const block = modBlocks[i];

            const nameMatch = block.match(/<Name>(.*?)<\/Name>/s);
            const uniqueNameMatch = block.match(/<UniqueName>(.*?)<\/UniqueName>/s);
            const descMatch = block.match(/<Description>(.*?)<\/Description>/s);

            const name = nameMatch ? nameMatch[1].trim() : '';
            const uniqueName = uniqueNameMatch ? uniqueNameMatch[1].trim() : '';
            const description = descMatch ? descMatch[1].trim() : '';

            const files = [];
            const fileMatches = block.matchAll(/<FileName>(.*?)<\/FileName>/gs);
            for (const fileMatch of fileMatches) {
              files.push(fileMatch[1].trim());
            }

            mods.push({
              name: name,
              uniqueName: uniqueName,
              description: description,
              files: files
            });
          }

          // sorts alphabetically (ordinal / ASCII), by name to match Spore Mod Manager CLI indices
          mods.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
          });
          for (let i = 0; i < mods.length; i++) {
            mods[i].index = i;
          }
          return mods;
        } catch (xmlErr) {
        }
      }
    }

    // Fallback: run CLI SporeModManager.exe list-installed
    return new Promise((resolve) => {
      execFile(managerExe, ['list-installed'], (err, stdout) => {
        if (err) {
          resolve([]);
          return;
        }
        const lines = stdout.split(/\r?\n/);
        const mods = [];
        let currentMod = null;
        for (const line of lines) {
          const match = line.match(/^\s*\[(\d+)\]\s+(.+)$/);
          if (match) {
            currentMod = {
              index: parseInt(match[1], 10),
              name: match[2].trim(),
              uniqueName: match[2].trim(),
              description: '',
              files: []
            };
            mods.push(currentMod);
          } else if (currentMod && line.startsWith('  ')) {
            currentMod.description = (currentMod.description + '\n' + line.trim()).trim();
          }
        }
        resolve(mods);
      });
    });
  } catch (err) {
    return [];
  }
}

async function _listInstalledModsRaw(launcher) {
  const mods = await _listInstalledModsRawInternal(launcher).catch(() => []);

  try {
    const detection = await launcher.detectGames();
    if (detection.sporega.installed && detection.sporega.path) {
      const originalExe = detection.sporega.path;
      const binDir = path.dirname(originalExe);
      const rootDir = path.dirname(binDir);

      const configDir = path.join(rootDir, 'DataEP1', 'Config');
      const backupConfig = path.join(configDir, 'ConfigManager.txt.backup');
      const backupProperties = path.join(configDir, 'Properties.txt.backup');

      const backupExe = path.join(binDir, 'SporeApp.exe.backup');

      if (fs.existsSync(backupExe)) {
        mods.push({
          index: -1,
          name: '4GB Patch',
          uniqueName: '4gb-patch',
          description: 'Modifies the game executable to support 4GB of RAM allocation, solving memory crash limits.',
          files: ['SporeApp.exe']
        });
      }

      if (fs.existsSync(backupConfig) || fs.existsSync(backupProperties)) {
        mods.push({
          index: -2,
          name: '60FPS Patch',
          uniqueName: '60fps-patch',
          description: 'Modifies game engine configurations to support 60 frames per second render rates.',
          files: ['ConfigManager.txt', 'Properties.txt']
        });
      }

      // Look for manual mods (unmanaged packages and dlls)
      const dataEP1Dir = path.join(rootDir, 'DataEP1');
      const modLibsDir = path.join(rootDir, 'SporeModLoader', 'ModLibs');

      const managedFiles = new Set();
      mods.forEach(m => {
        if (m.files) {
          m.files.forEach(f => managedFiles.add(getNormalizedBase(f)));
        }
      });

      const manualPackages = [];
      if (fs.existsSync(dataEP1Dir)) {
        try {
          const files = fs.readdirSync(dataEP1Dir);
          for (const file of files) {
            if (file.toLowerCase().endsWith('.package') && !file.toLowerCase().startsWith('spore_')) {
              const fileBase = getNormalizedBase(file);
              if (!managedFiles.has(fileBase)) {
                manualPackages.push(file);
              }
            }
          }
        } catch (e) {
        }
      }

      const manualDlls = [];
      if (fs.existsSync(modLibsDir)) {
        try {
          const files = fs.readdirSync(modLibsDir);
          for (const file of files) {
            if (file.toLowerCase().endsWith('.dll')) {
              const fileBase = getNormalizedBase(file);
              if (!managedFiles.has(fileBase)) {
                manualDlls.push(file);
              }
            }
          }
        } catch (e) {
        }
      }

      if (manualPackages.length > 0) {
        mods.push({
          index: -3,
          name: 'Manual Mod Packages',
          uniqueName: 'manual-mod-packages',
          description: 'Unmanaged loose .package mods detected in DataEP1 directory.',
          files: manualPackages
        });
      }

      if (manualDlls.length > 0) {
        mods.push({
          index: -4,
          name: 'Manual Mod DLLs',
          uniqueName: 'manual-mod-dlls',
          description: 'Unmanaged loose .dll mods detected in ModLibs directory.',
          files: manualDlls
        });
      }
    }
  } catch (err) {
  }

  return mods;
}

const LauncherService = {
  async detectGames() {
    let sporegaPath = null;
    const sporegaDatadir = await queryRegistry('HKLM\\SOFTWARE\\WOW6432Node\\electronic arts\\SPORE_EP1', 'datadir');
    if (sporegaDatadir) {
      sporegaPath = findExecutable(sporegaDatadir);
    }
    if (!sporegaPath) {
      sporegaPath = findFallbackExecutable();
    }

    let version = null;
    if (sporegaPath) {
      version = await getSporeAppVersion(sporegaPath);
    }

    return {
      sporega: {
        installed: !!sporegaPath,
        path: sporegaPath,
        version: version
      }
    };
  },

  async launchGame() {
    const detection = await this.detectGames();
    const gameInfo = detection.sporega;

    if (!gameInfo.installed || !gameInfo.path) {
      throw new Error('Spore GA not installed');
    }

    const exePath = gameInfo.path;
    const workingDir = path.dirname(exePath);

    return new Promise((resolve, reject) => {
      try {
        const child = spawn(exePath, [], {
          cwd: workingDir,
          detached: true,
          stdio: 'ignore'
        });

        child.unref();
        resolve({ success: true, pid: child.pid });
      } catch (err) {
        reject(err);
      }
    });
  },

  killGame() {
    return new Promise((resolve) => {
      exec('taskkill /F /IM SporeApp.exe', (err) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }
        resolve({ success: true });
      });
    });
  },

  checkGameRunning() {
    return new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq SporeApp.exe"', (err, stdout) => {
        if (err) {
          resolve({ running: false });
          return;
        }
        const isRunning = stdout.toLowerCase().includes('sporeapp.exe');
        resolve({ running: isRunning });
      });
    });
  },

  async getManagerExePath() {
    const detection = await this.detectGames();
    if (!detection.sporega.installed || !detection.sporega.path) {
      throw new Error('Spore GA not installed');
    }
    const rootDir = path.dirname(path.dirname(detection.sporega.path));
    const managerExe = path.join(rootDir, 'SporeModLoader', 'SporeModManager', 'SporeModManager.exe');
    if (!fs.existsSync(managerExe)) {
      throw new Error('Mod Manager not found');
    }
    return managerExe;
  },

  listInstalledMods() {
    return enqueue(async () => {
      return await _listInstalledModsRaw(this);
    });
  },

  installMod(filePath, selectedIndices = null) {
    return enqueue(async () => {
      if (!filePath) {
        throw new Error('File path required');
      }

      const { app } = require('electron');
      let finalFilePath = filePath;
      let filename = path.basename(filePath);
      let tempDirToClean = null;

      try {
        if (filename.toLowerCase().endsWith('.zip')) {
          const tempDir = app.getPath('temp');
          const tempDirName = `sporenext_manual_extract_${Date.now()}`;
          const tempExtractPath = path.join(tempDir, tempDirName);
          fs.mkdirSync(tempExtractPath, { recursive: true });
          tempDirToClean = tempExtractPath;

          // Unzip using PowerShell wrapper
          await extractZip(filePath, tempExtractPath);

          const findExtractedFiles = (dir) => {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
              const fPath = path.join(dir, file);
              const stat = fs.statSync(fPath);
              if (stat && stat.isDirectory()) {
                results = results.concat(findExtractedFiles(fPath));
              } else if (file.endsWith('.sporemod') || file.endsWith('.package') || file.endsWith('.dll')) {
                results.push(fPath);
              }
            });
            return results;
          };

          const extractedFiles = findExtractedFiles(tempExtractPath);
          if (extractedFiles.length === 0) {
            throw new Error('No mod files found');
          }

          finalFilePath = extractedFiles[0];
          filename = path.basename(finalFilePath);
        }

        if (filename.toLowerCase() === 'sporeapp.exe') {
          const detection = await this.detectGames();
          if (!detection.sporega.installed || !detection.sporega.path) {
            throw new Error('Spore GA not detected');
          }
          const originalExe = detection.sporega.path;
          const binDir = path.dirname(originalExe);
          const backupExe = path.join(binDir, 'SporeApp.exe.backup');

          if (!fs.existsSync(backupExe)) {
            fs.renameSync(originalExe, backupExe);
          } else {
            if (fs.existsSync(originalExe)) {
              fs.unlinkSync(originalExe);
            }
          }

          fs.copyFileSync(finalFilePath, originalExe);

          const steamAppIdPath = path.join(binDir, 'steam_appid.txt');
          if (!fs.existsSync(steamAppIdPath)) {
            fs.writeFileSync(steamAppIdPath, '24720', 'utf8');
          }

          return { success: true, output: '4GB Patch custom installed successfully.' };
        }

        if (filename.toLowerCase() === '60fps-patch') {
          const detection = await this.detectGames();
          if (!detection.sporega.installed || !detection.sporega.path) {
            throw new Error('Spore GA not detected');
          }
          const originalExe = detection.sporega.path;
          const binDir = path.dirname(originalExe);
          const rootDir = path.dirname(binDir);
          const configDir = path.join(rootDir, 'DataEP1', 'Config');

          const originalConfig = path.join(configDir, 'ConfigManager.txt');
          const originalProperties = path.join(configDir, 'Properties.txt');

          const backupConfig = path.join(configDir, 'ConfigManager.txt.backup');
          const backupProperties = path.join(configDir, 'Properties.txt.backup');

          if (!fs.existsSync(backupConfig)) {
            if (fs.existsSync(originalConfig)) {
              fs.renameSync(originalConfig, backupConfig);
            }
          } else {
            if (fs.existsSync(originalConfig)) {
              fs.unlinkSync(originalConfig);
            }
          }

          if (!fs.existsSync(backupProperties)) {
            if (fs.existsSync(originalProperties)) {
              fs.renameSync(originalProperties, backupProperties);
            }
          } else {
            if (fs.existsSync(originalProperties)) {
              fs.unlinkSync(originalProperties);
            }
          }

          const cacheConfig = path.join(finalFilePath, 'ConfigManager.txt');
          const cacheProperties = path.join(finalFilePath, 'Properties.txt');

          if (!fs.existsSync(cacheConfig) || !fs.existsSync(cacheProperties)) {
            throw new Error('Files not found');
          }

          fs.copyFileSync(cacheConfig, originalConfig);
          fs.copyFileSync(cacheProperties, originalProperties);

          return { success: true, output: '60FPS Patch custom installed successfully.' };
        }

        const cleanName = filename.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim();
        const cleanBase = getNormalizedBase(filename);

        let manifest = null;
        try {
          manifest = await this.getModManifestInfo(finalFilePath);
        } catch (manifestErr) {
        }

        const manifestNameNorm = manifest?.displayName ? getNormalizedBase(manifest.displayName) : '';
        const manifestUniqueNorm = manifest?.unique ? getNormalizedBase(manifest.unique) : '';

        const managerExe = await this.getManagerExePath();
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;
        let output = '';

        while (attempts < maxAttempts && !success) {
          attempts++;
          const installed = await _listInstalledModsRaw(this);
          const isAlreadyInstalled = installed.some(m => {
            if (m.name.toLowerCase().trim() === cleanName) return true;
            if (m.uniqueName && m.uniqueName.toLowerCase().trim() === cleanName) return true;
            if (m.files && m.files.some(file => file.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim() === cleanName)) return true;

            if (getNormalizedBase(m.name) === cleanBase) return true;
            if (m.uniqueName && getNormalizedBase(m.uniqueName) === cleanBase) return true;
            if (m.files && m.files.some(file => getNormalizedBase(file) === cleanBase)) return true;

            if (manifestNameNorm && getNormalizedBase(m.name) === manifestNameNorm) return true;
            if (manifestUniqueNorm && m.uniqueName && getNormalizedBase(m.uniqueName) === manifestUniqueNorm) return true;
            if (manifestNameNorm && m.uniqueName && getNormalizedBase(m.uniqueName) === manifestNameNorm) return true;
            if (manifestUniqueNorm && getNormalizedBase(m.name) === manifestUniqueNorm) return true;
            return false;
          });

          if (isAlreadyInstalled) {
            return { success: true, output: 'Already installed' };
          }

          await new Promise((resolve, reject) => {
            if (Array.isArray(selectedIndices) && selectedIndices.length > 0) {
              const child = spawn(managerExe, ['install', finalFilePath], { stdio: ['pipe', 'pipe', 'pipe'] });

              let stdoutData = '';
              let stderrData = '';

              child.stdout.on('data', (data) => {
                stdoutData += data.toString();
              });

              child.stderr.on('data', (data) => {
                stderrData += data.toString();
              });

              child.stdin.write(selectedIndices.join('\n') + '\n');
              child.stdin.end();

              child.on('close', (code) => {
                if (code !== 0) {
                  reject(new Error('Installation failed'));
                } else {
                  resolve({ success: true, output: stdoutData });
                }
              });

              child.on('error', (err) => {
                reject(err);
              });
            } else {
              execFile(managerExe, ['-y', 'install', finalFilePath], (err, stdout, stderr) => {
                if (err) {
                  reject(new Error('Failed'));
                  return;
                }
                resolve({ success: true, output: stdout });
              });
            }
          }).then(res => {
            output = res.output;
          }).catch(err => {
            if (attempts >= maxAttempts) throw err;
          });

          await new Promise(resolve => setTimeout(resolve, 500));
          const freshList = await _listInstalledModsRaw(this);
          const isInstalledNow = freshList.some(m => {
            if (m.name.toLowerCase().trim() === cleanName) return true;
            if (m.uniqueName && m.uniqueName.toLowerCase().trim() === cleanName) return true;
            if (m.files && m.files.some(file => file.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim() === cleanName)) return true;

            if (getNormalizedBase(m.name) === cleanBase) return true;
            if (m.uniqueName && getNormalizedBase(m.uniqueName) === cleanBase) return true;
            if (m.files && m.files.some(file => getNormalizedBase(file) === cleanBase)) return true;

            if (manifestNameNorm && getNormalizedBase(m.name) === manifestNameNorm) return true;
            if (manifestUniqueNorm && m.uniqueName && getNormalizedBase(m.uniqueName) === manifestUniqueNorm) return true;
            if (manifestNameNorm && m.uniqueName && getNormalizedBase(m.uniqueName) === manifestNameNorm) return true;
            if (manifestUniqueNorm && getNormalizedBase(m.name) === manifestUniqueNorm) return true;
            return false;
          });

          if (isInstalledNow) {
            success = true;
          } else if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        if (!success) {
          throw new Error('Installation failed');
        }

        return { success: true, output };
      } finally {
        if (tempDirToClean) {
          try {
            if (fs.existsSync(tempDirToClean)) {
              fs.rmSync(tempDirToClean, { recursive: true, force: true });
            }
          } catch (cleanErr) {
          }
        }
      }
    }, 1000);
  },

  uninstallMod(modName, modDetails) {
    return enqueue(async () => {
      if (modName === '60fps-patch' || (modDetails && modDetails.name === '60FPS Patch')) {
        const detection = await this.detectGames();
        if (!detection.sporega.installed || !detection.sporega.path) {
          throw new Error('Spore GA not detected');
        }
        const originalExe = detection.sporega.path;
        const binDir = path.dirname(originalExe);
        const rootDir = path.dirname(binDir);
        const configDir = path.join(rootDir, 'DataEP1', 'Config');

        const originalConfig = path.join(configDir, 'ConfigManager.txt');
        const originalProperties = path.join(configDir, 'Properties.txt');

        const backupConfig = path.join(configDir, 'ConfigManager.txt.backup');
        const backupProperties = path.join(configDir, 'Properties.txt.backup');

        if (fs.existsSync(backupConfig)) {
          if (fs.existsSync(originalConfig)) {
            fs.unlinkSync(originalConfig);
          }
          fs.renameSync(backupConfig, originalConfig);
        }

        if (fs.existsSync(backupProperties)) {
          if (fs.existsSync(originalProperties)) {
            fs.unlinkSync(originalProperties);
          }
          fs.renameSync(backupProperties, originalProperties);
        }

        return { success: true, output: '60FPS Patch custom uninstalled successfully.' };
      }

      if (modName === '4gb-patch' || (modDetails && modDetails.name === '4GB Patch')) {
        const detection = await this.detectGames();
        if (!detection.sporega.installed || !detection.sporega.path) {
          throw new Error('Spore GA not detected');
        }
        const originalExe = detection.sporega.path;
        const binDir = path.dirname(originalExe);
        const backupExe = path.join(binDir, 'SporeApp.exe.backup');

        if (fs.existsSync(backupExe)) {
          if (fs.existsSync(originalExe)) {
            fs.unlinkSync(originalExe);
          }
          fs.renameSync(backupExe, originalExe);

          const steamAppIdPath = path.join(binDir, 'steam_appid.txt');
          if (fs.existsSync(steamAppIdPath)) {
            try {
              fs.unlinkSync(steamAppIdPath);
            } catch (err) {
            }
          }

          return { success: true, output: '4GB Patch custom uninstalled successfully.' };
        } else {
          throw new Error('Backup not found');
        }
      }

      const installed = await _listInstalledModsRaw(this);
      let match = null;
      if (modDetails) {
        const targetBases = new Set();
        if (modDetails.filename) {
          targetBases.add(getNormalizedBase(modDetails.filename));
        }
        if (modDetails.github) {
          const parts = modDetails.github.split('/');
          const repoName = parts[parts.length - 1];
          if (repoName) targetBases.add(getNormalizedBase(repoName));
        }
        if (modDetails.name) {
          targetBases.add(getNormalizedBase(modDetails.name));
        }

        match = installed.find(m => {
          if (targetBases.has(getNormalizedBase(m.name))) return true;
          if (m.uniqueName && targetBases.has(getNormalizedBase(m.uniqueName))) return true;
          if (m.files && m.files.some(file => targetBases.has(getNormalizedBase(file)))) return true;
          return false;
        });
      }

      if (!match && modName !== undefined && modName !== null) {
        const targetBase = getNormalizedBase(String(modName));
        match = installed.find(m =>
          getNormalizedBase(m.name) === targetBase ||
          (m.uniqueName && getNormalizedBase(m.uniqueName) === targetBase) ||
          (m.files && m.files.some(file => getNormalizedBase(file) === targetBase))
        );
      }

      if (!match) {
        return { success: true, output: 'Already uninstalled' };
      }

      const targetIndex = match.index;
      const targetName = match.name;
      const targetUniqueName = match.uniqueName;
      const targetFiles = match.files || [];

      if (targetIndex === -3 || targetIndex === -4) {
        const detection = await this.detectGames();
        if (!detection.sporega.installed || !detection.sporega.path) {
          throw new Error('Spore GA not detected');
        }
        const rootDir = path.dirname(path.dirname(detection.sporega.path));
        const dataEP1Dir = path.join(rootDir, 'DataEP1');
        const modLibsDir = path.join(rootDir, 'SporeModLoader', 'ModLibs');
        const folder = targetIndex === -3 ? dataEP1Dir : modLibsDir;

        const filesToDelete = [...targetFiles];
        if (filesToDelete.length === 0) {
          const ext = targetIndex === -3 ? '.package' : '.dll';
          filesToDelete.push(targetName + ext);
        }

        for (const file of filesToDelete) {
          const filePath = path.join(folder, file);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              if (err.code === 'EPERM' || err.code === 'EACCES') {
                await new Promise((resolve, reject) => {
                  const escapedPath = filePath.replace(/'/g, "''");
                  const cmd = `Start-Process powershell -ArgumentList '-NoProfile -Command "Remove-Item -Path ''${escapedPath}'' -Force"' -Verb RunAs -WindowStyle Hidden`;
                  exec(cmd, (elevErr) => {
                    if (elevErr) {
                      reject(new Error('Permission denied'));
                    } else {
                      resolve();
                    }
                  });
                });
              } else {
                throw new Error('Delete failed');
              }
            }
          }
        }
        return { success: true, output: 'Manual mod files uninstalled successfully.' };
      }

      const managerExe = await this.getManagerExePath();
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      let output = '';

      while (attempts < maxAttempts && !success) {
        attempts++;

        await new Promise((resolve, reject) => {
          execFile(managerExe, ['uninstall', String(targetIndex)], (err, stdout, stderr) => {
            if (err) {
              reject(new Error('Failed'));
              return;
            }
            resolve({ success: true, output: stdout });
          });
        }).then(res => {
          output = res.output;
        }).catch(err => {
          if (attempts >= maxAttempts) throw err;
        });

        await new Promise(resolve => setTimeout(resolve, 500));
        const freshList = await _listInstalledModsRaw(this);
        const stillInstalled = freshList.some(m => {
          if (m.name === targetName || m.uniqueName === targetUniqueName) return true;
          if (getNormalizedBase(m.name) === getNormalizedBase(targetName)) return true;
          if (m.uniqueName && getNormalizedBase(m.uniqueName) === getNormalizedBase(targetUniqueName)) return true;
          return false;
        });

        if (!stillInstalled) {
          success = true;
        } else if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (!success) {
        throw new Error('Uninstall failed');
      }

      return { success: true, output };
    }, 1000);
  },

  updateMod(filePath) {
    return enqueue(async () => {
      const managerExe = await this.getManagerExePath();
      return new Promise((resolve, reject) => {
        execFile(managerExe, ['-y', 'update', filePath], (err, stdout, stderr) => {
          if (err) {
            reject(new Error('Failed'));
            return;
          }
          resolve({ success: true, output: stdout });
        });
      });
    }, 800);
  },

  updateModAPI() {
    return enqueue(async () => {
      const managerExe = await this.getManagerExePath();
      return new Promise((resolve, reject) => {
        execFile(managerExe, ['-y', 'update-modapi'], (err, stdout, stderr) => {
          if (err) {
            reject(new Error('Failed'));
            return;
          }
          resolve({ success: true, output: stdout });
        });
      });
    }, 1000);
  },

  getModComponents(filePath) {
    return new Promise((resolve) => {
      if (!filePath || !fs.existsSync(filePath)) {
        resolve({ hasComponents: false });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.zip' && ext !== '.sporemod') {
        resolve({ hasComponents: false });
        return;
      }

      // read ModInfo.xml from Zip using wrapper helper
      readXmlFromZip(filePath, 'ModInfo.xml')
        .then(async (xml) => {
          if (!xml) {
            resolve({ hasComponents: false });
            return;
          }

          try {
            const groups = [];
            const tagRegex = /(<componentGroup\s+[^>]*?>.*?<\/componentGroup>|<component\s+[^>]*?>.*?<\/component>)/gs;
            const matches = xml.matchAll(tagRegex);

            for (const match of matches) {
              const tagStr = match[0];
              if (tagStr.startsWith('<componentGroup')) {
                const groupAttrMatch = tagStr.match(/<componentGroup\s+([^>]*?)>/s);
                const groupAttrStr = groupAttrMatch ? groupAttrMatch[1] : '';
                const uniqueMatch = groupAttrStr.match(/unique="([^"]*?)"/);
                const displayMatch = groupAttrStr.match(/displayName="([^"]*?)"/);

                const groupUnique = uniqueMatch ? uniqueMatch[1] : '';
                const groupDisplay = displayMatch ? decodeXmlEntities(displayMatch[1]) : '';

                const components = [];
                const compMatches = tagStr.matchAll(/<component\s+([^>]*?)>(.*?)<\/component>/gs);
                for (const cMatch of compMatches) {
                  const attrStr = cMatch[1];
                  const fileVal = cMatch[2]?.trim() || '';

                  const cUniqueMatch = attrStr.match(/unique="([^"]*?)"/);
                  const cDisplayMatch = attrStr.match(/displayName="([^"]*?)"/);
                  const cDescMatch = attrStr.match(/description="([^"]*?)"/);
                  const cDefaultMatch = attrStr.match(/defaultChecked="([^"]*?)"/);

                  components.push({
                    unique: cUniqueMatch ? cUniqueMatch[1] : '',
                    displayName: cDisplayMatch ? decodeXmlEntities(cDisplayMatch[1]) : '',
                    description: cDescMatch ? decodeXmlEntities(cDescMatch[1]) : '',
                    defaultChecked: cDefaultMatch ? cDefaultMatch[1] === 'true' : false,
                    file: fileVal
                  });
                }

                if (components.length > 0) {
                  groups.push({
                    type: 'group',
                    unique: groupUnique,
                    displayName: groupDisplay,
                    components
                  });
                }
              } else {
                const attrMatch = tagStr.match(/<component\s+([^>]*?)>/s);
                const attrStr = attrMatch ? attrMatch[1] : '';
                const fileVal = tagStr.match(/<component\s+[^>]*?>(.*?)<\/component>/s)?.[1]?.trim() || '';

                const cUniqueMatch = attrStr.match(/unique="([^"]*?)"/);
                const cDisplayMatch = attrStr.match(/displayName="([^"]*?)"/);
                const cDescMatch = attrStr.match(/description="([^"]*?)"/);
                const cDefaultMatch = attrStr.match(/defaultChecked="([^"]*?)"/);

                const uniqueId = cUniqueMatch ? cUniqueMatch[1] : '';
                const displayNameVal = cDisplayMatch ? decodeXmlEntities(cDisplayMatch[1]) : '';
                const descriptionVal = cDescMatch ? decodeXmlEntities(cDescMatch[1]) : '';

                groups.push({
                  type: 'standalone',
                  unique: uniqueId,
                  displayName: displayNameVal,
                  components: [{
                    unique: uniqueId,
                    displayName: displayNameVal,
                    description: descriptionVal,
                    defaultChecked: cDefaultMatch ? cDefaultMatch[1] === 'true' : false,
                    file: fileVal
                  }]
                });
              }
            }

            if (groups.length > 0) {
              const tempDir = path.join(os.tmpdir(), 'sporenext-mod-' + Math.random().toString(36).substring(2, 15));

              extractImagesFromZip(filePath, tempDir)
                .then(() => {
                  if (fs.existsSync(tempDir)) {
                    const files = fs.readdirSync(tempDir);
                    for (const g of groups) {
                      for (const c of g.components) {
                        const baseName = c.unique.toLowerCase();
                        const matchingFile = files.find(f => {
                          const nameWithoutExt = path.basename(f, path.extname(f)).toLowerCase();
                          return nameWithoutExt === baseName;
                        });
                        if (matchingFile) {
                          const extName = path.extname(matchingFile).toLowerCase();
                          const mimeType = extName === '.png' ? 'image/png' : 'image/jpeg';
                          try {
                            const imgBuffer = fs.readFileSync(path.join(tempDir, matchingFile));
                            c.image = `data:${mimeType};base64,${imgBuffer.toString('base64')}`;
                          } catch (readErr) {
                          }
                        }
                      }
                    }
                    try {
                      fs.rmSync(tempDir, { recursive: true, force: true });
                    } catch (rmErr) {
                    }
                  }
                  resolve({ hasComponents: true, groups });
                })
                .catch((imgErr) => {
                  resolve({ hasComponents: true, groups });
                });
            } else {
              resolve({ hasComponents: false });
            }
          } catch (parseErr) {
            resolve({ hasComponents: false });
          }
        })
        .catch((xmlErr) => {
          resolve({ hasComponents: false });
        });
    });
  },

  getModManifestInfo(filePath) {
    return new Promise((resolve) => {
      if (!filePath || !fs.existsSync(filePath)) {
        resolve(null);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.zip' && ext !== '.sporemod') {
        resolve(null);
        return;
      }

      readXmlFromZip(filePath, 'ModInfo.xml')
        .then((xml) => {
          if (!xml) {
            resolve(null);
            return;
          }

          try {
            const modMatch = xml.match(/<mod\s+([^>]*?)>/i);
            if (modMatch) {
              const attrStr = modMatch[1];
              const displayMatch = attrStr.match(/displayName="([^"]*?)"/);
              const uniqueMatch = attrStr.match(/unique="([^"]*?)"/);

              resolve({
                displayName: displayMatch ? displayMatch[1] : '',
                unique: uniqueMatch ? uniqueMatch[1] : ''
              });
              return;
            }
          } catch (e) {
          }
          resolve(null);
        })
        .catch((err) => {
          resolve(null);
        });
    });
  }
};

module.exports = LauncherService;
