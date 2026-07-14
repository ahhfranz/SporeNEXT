const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function queryRegistry(key, value) {
  return new Promise((resolve) => {
    const cmd = `reg query "${key}" /v ${value}`;
    exec(cmd, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes(value)) {
          const parts = line.trim().split(/\s+/);
          const typeIndex = parts.indexOf('REG_SZ');
          if (typeIndex !== -1 && parts.length > typeIndex + 1) {
            const pathVal = parts.slice(typeIndex + 1).join(' ');
            resolve(pathVal.trim());
            return;
          }
        }
      }
      resolve(null);
    });
  });
}

function getSporeAppVersion(exePath) {
  return new Promise((resolve) => {
    if (!exePath || !fs.existsSync(exePath)) {
      resolve(null);
      return;
    }
    const escapedPath = exePath.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "[System.Diagnostics.FileVersionInfo]::GetVersionInfo('${escapedPath}').FileVersion"`;

    exec(cmd, { timeout: 3000 }, (error, stdout) => {
      if (error) {
        const cmd2 = `powershell -NoProfile -Command "(Get-Item '${escapedPath}').VersionInfo.FileVersion"`;
        exec(cmd2, { timeout: 3000 }, (error2, stdout2) => {
          if (error2 || !stdout2) {
            resolve(null);
          } else {
            resolve(stdout2.trim());
          }
        });
        return;
      }
      resolve(stdout ? stdout.trim() : null);
    });
  });
}

function findExecutable(datadir) {
  if (!datadir) return null;
  const binFolder = 'SporebinEP1';

  const candidates = [
    path.join(datadir, '..', binFolder, 'SporeApp.exe'),
    path.join(datadir, binFolder, 'SporeApp.exe')
  ];

  for (const cand of candidates) {
    const normalized = path.normalize(cand);
    if (fs.existsSync(normalized)) {
      return normalized;
    }
  }
  return null;
}

function findFallbackExecutable() {
  const drives = ['C:', 'D:', 'E:', 'F:'];
  const binFolder = 'SporebinEP1';

  const defaultSubpaths = [
    // Steam default
    `Program Files (x86)/Steam/steamapps/common/Spore/${binFolder}/SporeApp.exe`,
    `SteamLibrary/steamapps/common/spore/${binFolder}/SporeApp.exe`,
    // EA default
    `Program Files/EA Games/SPORE/${binFolder}/SporeApp.exe`,
    `Program Files/EA Games/SPORE Galactic Adventures/${binFolder}/SporeApp.exe`,
    // GOG default
    `GOG Games/Spore/${binFolder}/SporeApp.exe`,
    `GOG Games/Spore Galactic Adventures/${binFolder}/SporeApp.exe`
  ];

  for (const drive of drives) {
    for (const subpath of defaultSubpaths) {
      const fullPath = path.join(drive, subpath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

module.exports = {
  queryRegistry,
  getSporeAppVersion,
  findExecutable,
  findFallbackExecutable
};
