const { app } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// clean and parse gh repository path (owner/repo)
function parseGithubUrl(githubUrl) {
  if (!githubUrl) return null;
  const cleanUrl = githubUrl.split('?')[0].replace(/\/+$/, '');
  const match = cleanUrl.match(/(?:github\.com\/|^)([^\/]+)\/([^\/]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return cleanUrl;
}

// get the downloads directory, creating it if it doesnt exist
function getDownloadDir() {
  const downloadDir = path.join(app.getPath('userData'), 'downloads');

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  } else {
    // clean up
    try {
      const items = fs.readdirSync(downloadDir);
      for (const item of items) {
        if (item.startsWith('temp_extract_')) {
          const itemPath = path.join(downloadDir, item);
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        }
      }
    } catch (err) {
    }
  }
  return downloadDir;
}

// fetch the url  of the asset from the latest GitHub release
function getGithubLatestReleaseUrl(githubUrl, filename) {
  return new Promise((resolve, reject) => {
    const repoPath = parseGithubUrl(githubUrl);
    if (!repoPath) {
      reject(new Error('Invalid download URL'));
      return;
    }

    const apiUrl = `https://api.github.com/repos/${repoPath}/releases/latest`;

    https.get(apiUrl, {
      headers: {
        'User-Agent': 'SporeNEXT-Launcher',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('Failed to fetch release'));
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          if (!release.assets || release.assets.length === 0) {
            reject(new Error('No assets found'));
            return;
          }

          // Try to match the exact filename
          let asset = release.assets.find(
            a => a.name.toLowerCase() === filename.toLowerCase()
          );

          // fallback to any file ending with .sporemod or .zip if exact filename is not found
          if (!asset) {
            asset = release.assets.find(
              a => a.name.endsWith('.sporemod') || a.name.endsWith('.zip')
            );
          }

          if (asset && asset.browser_download_url) {
            resolve(asset.browser_download_url);
          } else {
            reject(new Error('Asset not found'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// single download attempt 
function downloadFileRaw(url, destPath, onProgress) {
  const partPath = destPath + '.part';

  return new Promise((resolve, reject) => {
    let existingBytes = 0;
    if (fs.existsSync(partPath)) {
      try {
        existingBytes = fs.statSync(partPath).size;
      } catch (err) {
      }
    }

    const client = url.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'SporeNEXT-Launcher'
    };

    if (existingBytes > 0) {
      headers['Range'] = `bytes=${existingBytes}-`;
    }

    const request = client.get(url, { headers }, (res) => {
      // follow redirects (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFileRaw(res.headers.location, destPath, onProgress)
          .then(resolve)
          .catch(reject);
      }

      let isPartial = false;
      let totalBytes = 0;
      let downloadedBytes = 0;

      if (res.statusCode === 206) {
        isPartial = true;
        downloadedBytes = existingBytes;
        const contentLength = parseInt(res.headers['content-length'], 10) || 0;
        const contentRange = res.headers['content-range'] || '';
        const totalMatch = contentRange.match(/\/(\d+)$/);
        totalBytes = totalMatch ? parseInt(totalMatch[1], 10) : (downloadedBytes + contentLength);
      } else if (res.statusCode === 200) {
        isPartial = false;
        downloadedBytes = 0;
        totalBytes = parseInt(res.headers['content-length'], 10) || 0;
        if (fs.existsSync(partPath)) {
          try { fs.unlinkSync(partPath); } catch (e) { }
        }
      } else if (res.statusCode === 416) {
        // delete part file and retry
        if (fs.existsSync(partPath)) {
          try { fs.unlinkSync(partPath); } catch (e) { }
        }
        return downloadFileRaw(url, destPath, onProgress)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('Download failed'));
        return;
      }

      const fileStream = fs.createWriteStream(partPath, { flags: isPartial ? 'a' : 'w' });

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        fileStream.write(chunk);

        if (onProgress) {
          const percent = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          onProgress({ downloadedBytes, totalBytes, percent });
        }
      });

      res.on('end', () => {
        fileStream.end();
        if (totalBytes && downloadedBytes < totalBytes) {
          const errMsg = `Premature close: only downloaded ${downloadedBytes} of ${totalBytes} bytes.`;
          fileStream.destroy(new Error(errMsg));
        }
      });

      fileStream.on('finish', () => {
        try {
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
          fs.renameSync(partPath, destPath);
          resolve();
        } catch (err) {
          reject(new Error('Download failed'));
        }
      });

      fileStream.on('error', (err) => {
        fileStream.close();
        reject(err);
      });

      res.on('error', (err) => {
        fileStream.close();
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });
  });
}

// Download a file from a URL, support redirects and automatic retries
function downloadFile(url, destPath, onProgress) {
  const MAX_RETRIES = 5;

  const attemptDownload = (currentAttempt) => {
    return downloadFileRaw(url, destPath, onProgress)
      .catch((err) => {
        const isClientError = err.message.includes('status code 404') || err.message.includes('status code 403');
        if (currentAttempt < MAX_RETRIES && !isClientError) {
          const backoffDelay = Math.pow(2, currentAttempt) * 1000;
          return new Promise(resolve => setTimeout(resolve, backoffDelay))
            .then(() => attemptDownload(currentAttempt + 1));
        }
        throw err;
      });
  };

  return attemptDownload(1);
}

function parseGithubInfo(githubUrl) {
  if (!githubUrl) return null;
  const cleanUrl = githubUrl.split('?')[0].replace(/\/+$/, '');
  const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];

  // try matching releases/download/tag/filename
  const downloadMatch = cleanUrl.match(/\/releases\/download\/([^/]+)/);
  if (downloadMatch) {
    const tag = downloadMatch[1].split('/')[0];
    return { owner, repo, tag };
  }

  const tagMatch = cleanUrl.match(/\/releases\/tag\/([^\/]+)/);
  if (tagMatch) {
    const tag = tagMatch[1].split('/')[0];
    return { owner, repo, tag };
  }
  return { owner, repo, tag: null };
}

async function downloadMod(modId, downloadInfo, onProgress) {
  const { filename, github, downloadUrl } = downloadInfo;

  if (!filename) {
    throw new Error('Filename is required for download.');
  }

  const downloadDir = getDownloadDir();

  // this should intercept 60FPS Patch mod custom download
  if (filename === '60fps-patch') {
    const targetFolder = path.join(downloadDir, '60fps-patch');
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const urlConfig = 'https://github.com/bisfranz/Spore-Mods-Collection/releases/download/60FPS-Patch/ConfigManager.txt';
    const urlProperties = 'https://github.com/bisfranz/Spore-Mods-Collection/releases/download/60FPS-Patch/Properties.txt';

    // download ConfigManager.txt
    if (onProgress) onProgress({ percent: 10, downloadedBytes: 0, totalBytes: 200 });
    await downloadFile(urlConfig, path.join(targetFolder, 'ConfigManager.txt'));

    // download Properties.txt
    if (onProgress) onProgress({ percent: 50, downloadedBytes: 100, totalBytes: 200 });
    await downloadFile(urlProperties, path.join(targetFolder, 'Properties.txt'));

    if (onProgress) onProgress({ percent: 100, downloadedBytes: 200, totalBytes: 200 });
    return targetFolder;
  }

  let destPath = path.join(downloadDir, filename);

  let finalUrl = null;
  let isZip = filename.endsWith('.zip');

  if (downloadUrl) {
    finalUrl = downloadUrl;
    isZip = downloadUrl.toLowerCase().includes('.zip') || filename.endsWith('.zip');
  } else if (github) {
    try {
      finalUrl = await getGithubLatestReleaseUrl(github, filename);
      isZip = finalUrl.toLowerCase().includes('.zip') || filename.endsWith('.zip');
    } catch (err) {
      const info = parseGithubInfo(github);
      if (info) {
        if (info.tag) {
          finalUrl = `https://github.com/${info.owner}/${info.repo}/releases/download/${info.tag}/${filename}`;
        } else {
          finalUrl = `https://github.com/${info.owner}/${info.repo}/releases/latest/download/${filename}`;
        }
        isZip = finalUrl.toLowerCase().includes('.zip') || filename.endsWith('.zip');
      } else {
        throw err;
      }
    }
  } else {
    throw new Error('No download source (GitHub or Direct URL) provided.');
  }

  if (!finalUrl) {
    throw new Error('Could not resolve download URL.');
  }

  // Ensures the download folder exists before launching download
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  // If the resolved url is a zip but the destination path is not, adjust destination to be a .zip
  // so that the download is saved with the correct extension welp
  if (isZip && !destPath.toLowerCase().endsWith('.zip')) {
    destPath = destPath + '.zip';
  }

  try {
    await downloadFile(finalUrl, destPath, onProgress);
  } catch (err) {
    // ff the .sporemod file download returned 404, fallback to download the .zip file
    if (err.message.includes('status code 404') && filename.endsWith('.sporemod')) {
      const zipFilename = filename.replace(/\.sporemod$/i, '.zip');
      const zipUrl = finalUrl.replace(/\.sporemod$/i, '.zip');
      const zipDestPath = path.join(downloadDir, zipFilename);

      try {
        await downloadFile(zipUrl, zipDestPath, onProgress);
        destPath = zipDestPath;
        isZip = true;
      } catch (zipErr) {
        throw new Error('Download failed');
      }
    } else {
      throw err;
    }
  }

  // If the file downloaded is a zip, it will extract
  if (isZip || destPath.endsWith('.zip')) {
    const tempDir = app.getPath('temp');
    const tempDirName = `sporenext_temp_extract_${Date.now()}`;
    const tempExtractPath = path.join(tempDir, tempDirName);
    fs.mkdirSync(tempExtractPath, { recursive: true });

    try {
      // unzip using PowerShell
      const absZipPath = path.resolve(destPath);
      const absTempExtractPath = path.resolve(tempExtractPath);

      await new Promise((resolve, reject) => {
        const cmd = `Expand-Archive -Path '${absZipPath.replace(/'/g, "''")}' -DestinationPath '${absTempExtractPath.replace(/'/g, "''")}' -Force`;
        const base64Cmd = Buffer.from(cmd, 'utf-16le').toString('base64');
        const child = spawn('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-EncodedCommand',
          base64Cmd
        ]);

        let stderrData = '';
        child.stderr.on('data', (data) => {
          stderrData += data.toString();
        });

        child.on('close', (code) => {
          if (code !== 0) {
            reject(new Error('Extraction failed'));
          } else {
            resolve();
          }
        });
      });

      // finds the extracted .sporemod or .package files inside tempExtractPath
      const findExtractedFiles = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(findExtractedFiles(filePath));
          } else if (file.endsWith('.sporemod') || file.endsWith('.package')) {
            results.push(filePath);
          }
        });
        return results;
      };

      const extractedFiles = findExtractedFiles(tempExtractPath);
      if (extractedFiles.length === 0) {
        throw new Error('No mod files found');
      }

      // move the first matched mod file to the main downloads directory
      const sourceModPath = extractedFiles[0];
      const extractedFilename = path.basename(sourceModPath);
      const finalModPath = path.join(downloadDir, extractedFilename);

      fs.copyFileSync(sourceModPath, finalModPath);
      fs.unlinkSync(sourceModPath);

      // delete the downloaded .zip file
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }

      destPath = finalModPath;
    } catch (extractErr) {
      // Clean up the downloaded zip if extraction failed so it doesnt pollute the downloads directory
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) { }
      }
      throw new Error('Extraction failed');
    } finally {
      // Clean up temp extract directory
      try {
        if (fs.existsSync(tempExtractPath)) {
          fs.rmSync(tempExtractPath, { recursive: true, force: true });
        }
      } catch (cleanErr) {
      }
    }
  }

  return destPath;
}

function getFolderSize(dirPath) {
  let size = 0;
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fp = path.join(dirPath, file);
      const stat = fs.statSync(fp);
      if (stat.isFile()) size += stat.size;
      else if (stat.isDirectory()) size += getFolderSize(fp);
    }
  }
  return size;
}

function getDownloadedFiles() {
  const downloadDir = getDownloadDir();
  if (!fs.existsSync(downloadDir)) return [];
  try {
    return fs.readdirSync(downloadDir).filter(file => {
      const filePath = path.join(downloadDir, file);
      const stat = fs.statSync(filePath);
      return stat.isFile() || (stat.isDirectory() && file === '60fps-patch');
    });
  } catch (err) {
    return [];
  }
}

const CACHE_FILE_PATH = path.join(app.getPath('userData'), 'github_releases_cache.json');
const CACHE_TTL_MS = 8 * 60 * 60 * 1000;

function loadGithubCache() {
  if (!fs.existsSync(CACHE_FILE_PATH)) return {};
  try {
    const content = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return {};
  }
}

function saveGithubCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
  }
}

async function resolveGithubAsset(githubUrl, updatedAt = null) {
  if (!githubUrl) return null;

  const cache = loadGithubCache();
  const cachedData = cache[githubUrl];

  if (cachedData && updatedAt && cachedData.updatedAt === updatedAt) {
    return {
      filename: cachedData.filename,
      size: cachedData.size,
      downloadUrl: cachedData.downloadUrl
    };
  }

  if (cachedData && cachedData.cachedAt && (Date.now() - cachedData.cachedAt < CACHE_TTL_MS)) {
    return {
      filename: cachedData.filename,
      size: cachedData.size,
      downloadUrl: cachedData.downloadUrl
    };
  }

  try {
    const cleanPath = githubUrl
      .replace(/https?:\/\/(www\.)?github\.com\//, '')
      .replace(/\/+$/, '');

    let apiUri;
    const tagMatch = cleanPath.match(/^([^/]+\/[^/]+)\/releases\/tag\/([^/]+)/);
    if (tagMatch) {
      const repo = tagMatch[1];
      const tag = tagMatch[2];
      apiUri = `https://api.github.com/repos/${repo}/releases/tags/${tag}`;
    } else {
      const parts = cleanPath.split('/');
      const repo = parts.slice(0, 2).join('/');
      apiUri = `https://api.github.com/repos/${repo}/releases/latest`;
    }

    const res = await fetch(apiUri, {
      headers: {
        'User-Agent': 'SporeNEXT-Launcher',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      if (res.status === 403) {
        if (cachedData) {
          return {
            filename: cachedData.filename,
            size: cachedData.size,
            downloadUrl: cachedData.downloadUrl
          };
        }
      } else {
      }
      return null;
    }

    const release = await res.json();
    if (!release.assets || release.assets.length === 0) return null;

    let asset = release.assets.find(a => a.name.endsWith('.sporemod') && !a.name.toLowerCase().includes('sample') && !a.name.toLowerCase().includes('demo'));
    if (!asset) asset = release.assets.find(a => a.name === 'SporeApp.exe');
    if (!asset) asset = release.assets.find(a => a.name.endsWith('.zip') && !a.name.toLowerCase().includes('sample') && !a.name.toLowerCase().includes('demo'));
    if (!asset && release.assets.length > 0) {
      asset = release.assets.find(a => !a.name.toLowerCase().includes('sample') && !a.name.toLowerCase().includes('demo')) || release.assets[0];
    }
    if (!asset) return null;

    const { size: sizeBytes, name: filename } = asset;
    let size;
    if (sizeBytes >= 1024 * 1024 * 1024) size = `${(sizeBytes / (1024 ** 3)).toFixed(1)} GB`;
    else if (sizeBytes >= 1024 * 1024) size = `${(sizeBytes / (1024 ** 2)).toFixed(1)} MB`;
    else if (sizeBytes >= 1024) size = `${(sizeBytes / 1024).toFixed(1)} KB`;
    else size = `${sizeBytes} B`;

    const result = {
      filename,
      size,
      downloadUrl: asset.browser_download_url
    };

    cache[githubUrl] = {
      ...result,
      updatedAt: updatedAt || null,
      cachedAt: Date.now()
    };
    saveGithubCache(cache);

    return result;
  } catch (err) {
    if (cachedData) {
      return {
        filename: cachedData.filename,
        size: cachedData.size,
        downloadUrl: cachedData.downloadUrl
      };
    }
    return null;
  }
}

function getCacheSize() {
  const dir = getDownloadDir();
  if (!fs.existsSync(dir)) return 0;
  try {
    const files = fs.readdirSync(dir);
    let total = 0;
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        total += stat.size;
      } else if (stat.isDirectory()) {
        total += getFolderSize(filePath);
      }
    }
    return total;
  } catch (err) {
    return 0;
  }
}

function getCacheFiles() {
  const dir = getDownloadDir();
  if (!fs.existsSync(dir)) return [];
  try {
    const files = fs.readdirSync(dir);
    const list = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        list.push({
          name: file,
          sizeBytes: stat.size,
          sizeFormatted: formatBytes(stat.size)
        });
      } else if (stat.isDirectory() && file === '60fps-patch') {
        const folderSize = getFolderSize(filePath);
        list.push({
          name: file,
          sizeBytes: folderSize,
          sizeFormatted: formatBytes(folderSize)
        });
      }
    }
    return list;
  } catch (err) {
    return [];
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function deleteCacheFile(filename) {
  const dir = getDownloadDir();
  const filePath = path.join(dir, filename);
  if (path.dirname(filePath) !== dir) {
    throw new Error('Access denied: Invalid filename.');
  }
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return true;
  }
  return false;
}

function clearCache() {
  const dir = getDownloadDir();
  if (!fs.existsSync(dir)) return true;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        fs.unlinkSync(filePath);
      } else if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function installOrUpdateSporeModLoader(sporeRootPath, currentVersion) {
  // retrieve the latest version from GitHub
  // check the local release cache first to avoid exceeding the gh API rate limits
  const cacheKey = 'https://github.com/Rosalie241/SporeModLoader';
  const cache = loadGithubCache();
  const cachedData = cache[cacheKey];

  let latestVersion = null;
  let downloadUrl = null;

  if (cachedData && cachedData.cachedAt && (Date.now() - cachedData.cachedAt < 60 * 60 * 1000)) {
    latestVersion = cachedData.filename;
    downloadUrl = cachedData.downloadUrl;
  } else {
    try {
      // query the GitHub API to get release details for the latest official SporeModLoader
      const apiUri = 'https://api.github.com/repos/Rosalie241/SporeModLoader/releases/latest';
      const res = await fetch(apiUri, {
        headers: {
          'User-Agent': 'SporeNEXT-Launcher',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) {
        throw new Error('Update failed');
      }

      const release = await res.json();
      if (!release.assets || release.assets.length === 0) {
        throw new Error('Update failed');
      }

      const winAsset = release.assets.find(a => a.name.endsWith('.zip'));
      if (!winAsset) {
        throw new Error('Update failed');
      }

      latestVersion = winAsset.name;
      downloadUrl = winAsset.browser_download_url;

      // save the release details into local cache
      cache[cacheKey] = {
        filename: latestVersion,
        size: '0 B',
        downloadUrl: downloadUrl,
        cachedAt: Date.now()
      };
      saveGithubCache(cache);
    } catch (err) {
      if (cachedData) {
        latestVersion = cachedData.filename;
        downloadUrl = cachedData.downloadUrl;
      } else {
        throw err;
      }
    }
  }

  // validate local installation
  // check if essential files already exist in the game directory paths
  const binDir = path.join(sporeRootPath, 'SporebinEP1');
  const destSporebinDll = path.join(binDir, 'dinput8.dll'); // injection .dll
  const destModLoader = path.join(sporeRootPath, 'SporeModLoader'); // Mod Loader folder

  const filesExist = fs.existsSync(destSporebinDll) && fs.existsSync(destModLoader);

  // if the current saved version matches GitHub and physical files exist = no update needed
  if (currentVersion === latestVersion && filesExist) {
    return { updated: false, version: latestVersion };
  }

  // download the archive package
  // defines a temporary path to save the SporeModLoader zip file
  const tempZipPath = path.join(app.getPath('temp'), latestVersion);

  await downloadFile(downloadUrl, tempZipPath);

  // extract zip contents using PowerShell
  // creates a temporary directory to extract the package content
  const tempExtractPath = path.join(app.getPath('temp'), `sml_extract_${Date.now()}`);
  fs.mkdirSync(tempExtractPath, { recursive: true });

  try {
    const absZipPath = path.resolve(tempZipPath);
    const absTempExtractPath = path.resolve(tempExtractPath);

    // invokes PowerShell to extract the archive
    await new Promise((resolve, reject) => {
      const cmd = `Expand-Archive -Path '${absZipPath.replace(/'/g, "''")}' -DestinationPath '${absTempExtractPath.replace(/'/g, "''")}' -Force`;
      const base64Cmd = Buffer.from(cmd, 'utf-16le').toString('base64');
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        base64Cmd
      ]);

      let stderrData = '';
      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Extraction failed'));
        } else {
          resolve();
        }
      });
    });

    // copy to the Spore directory
    const srcSporebin = path.join(tempExtractPath, 'SporebinEP1');
    const srcModLoader = path.join(tempExtractPath, 'SporeModLoader');

    // ensures the extracted package contains the expected folders
    if (!fs.existsSync(srcSporebin) || !fs.existsSync(srcModLoader)) {
      throw new Error('Invalid update package');
    }

    if (!fs.existsSync(sporeRootPath)) {
      throw new Error('Spore path not found');
    }

    // copy the files into the Spore directory (overwriting dinput8.dll and updating SporeModLoader folder)
    fs.cpSync(srcSporebin, path.join(sporeRootPath, 'SporebinEP1'), { recursive: true, force: true });
    fs.cpSync(srcModLoader, path.join(sporeRootPath, 'SporeModLoader'), { recursive: true, force: true });

    return { updated: true, version: latestVersion };
  } finally {
    // clean up temporary files
    // deletes the downloaded zip and temporary extraction folder
    try {
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
      if (fs.existsSync(tempExtractPath)) {
        fs.rmSync(tempExtractPath, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
    }
  }
}

module.exports = {
  getDownloadDir,
  downloadMod,
  getDownloadedFiles,
  resolveGithubAsset,
  getCacheSize,
  getCacheFiles,
  deleteCacheFile,
  clearCache,
  installOrUpdateSporeModLoader
};
