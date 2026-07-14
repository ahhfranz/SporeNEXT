const githubAssetCache = {};

try {
  const cachedModsRaw = localStorage.getItem('sporenext_mods_cache');
  if (cachedModsRaw) {
    const cachedMods = JSON.parse(cachedModsRaw);

    cachedMods.forEach(m => {
      if (m.github && m.resolved_download_url) {
        const cacheKey = `${m.github}::${m.updated_at || ''}`;
        githubAssetCache[cacheKey] = Promise.resolve({
          filename: m.filename,
          size: m.size,
          downloadUrl: m.resolved_download_url
        });
      }
    });
  }
} catch (e) {
  console.warn('Failed to pre-populate GitHub asset cache from localStorage:', e);
}

export function getNormalizedBase(fname) {
  if (!fname) return '';
  return fname
    .replace(/\.(sporemod|zip|package|dll)$/i, '')
    .replace(/^!+/, '')
    .replace(/^[zZ]+(?=[A-Z])/, '')
    .toLowerCase()
    .replace(/[-_]v?\d+(\.\d+)*$/i, '')
    .replace(/v?\d+(\.\d+)+$/i, '')
    .replace(/[-_.]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function parseGithubInfo(githubUrl) {
  if (!githubUrl) return null;
  const cleanUrl = githubUrl.split('?')[0].replace(/\/+$/, '');
  const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];

  // try matching releases/download/tag/filename
  const downloadMatch = cleanUrl.match(/\/releases\/download\/([^/]+)/);
  if (downloadMatch) {
    const tag = downloadMatch[1].split('/')[0];
    return { owner, repo, tag };
  }

  const tagMatch = cleanUrl.match(/\/releases\/tag\/([^/]+)/);
  if (tagMatch) {
    const tag = tagMatch[1].split('/')[0];
    return { owner, repo, tag };
  }
  return { owner, repo, tag: null };
}

export function resolveGitHubAsset(githubUrl, updatedAt = null) {
  const cacheKey = `${githubUrl}::${updatedAt || ''}`;
  if (githubAssetCache[cacheKey]) {
    return githubAssetCache[cacheKey];
  }

  const promise = (async () => {
    try {
      if (window.electronAPI && window.electronAPI.resolveGitHubAsset) {
        const result = await window.electronAPI.resolveGitHubAsset(githubUrl, updatedAt);
        if (result === null) {
          return null;
        }
        return result;
      }

      // browser fallback (running outside of Electron)
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

      const res = await fetch(apiUri);
      if (!res.ok) {
        if (res.status === 403) {
          return null;
        }
        delete githubAssetCache[cacheKey];
        return null;
      }

      const release = await res.json();
      let asset = release.assets.find(a => a.name.endsWith('.sporemod') && !a.name.toLowerCase().includes('sample') && !a.name.toLowerCase().includes('demo'));
      if (!asset) asset = release.assets.find(a => a.name.endsWith('.zip') && !a.name.toLowerCase().includes('sample') && !a.name.toLowerCase().includes('demo'));
      if (!asset && release.assets.length > 0) {
        asset = release.assets.find(a => !a.name.toLowerCase().includes('sample') && !a.name.toLowerCase().includes('demo')) || release.assets[0];
      }
      if (!asset) {
        return null;
      }

      const { size: sizeBytes, name: filename } = asset;
      let size;
      if (sizeBytes >= 1024 * 1024 * 1024) size = `${(sizeBytes / (1024 ** 3)).toFixed(1)} GB`;
      else if (sizeBytes >= 1024 * 1024) size = `${(sizeBytes / (1024 ** 2)).toFixed(1)} MB`;
      else if (sizeBytes >= 1024) size = `${(sizeBytes / 1024).toFixed(1)} KB`;
      else size = `${sizeBytes} B`;

      return { filename, size, downloadUrl: asset.browser_download_url };
    } catch (err) {
      console.warn(`Error resolving GitHub asset for ${githubUrl}:`, err);
      delete githubAssetCache[cacheKey];
      return null;
    }
  })();

  githubAssetCache[cacheKey] = promise;
  return promise;
}

export async function enrichMod(mod, downloadedFiles, installedMods) {
  if (mod.name === '4GB Patch') {
    mod.github = 'https://github.com/bisfranz/Spore-Mods-Collection/releases/tag/4GB-Patch';
    mod.download_url = '';
  }

  if (mod.name === '60FPS Patch') {
    mod.github = 'https://github.com/bisfranz/Spore-Mods-Collection/releases/tag/60FPS-Patch';
    mod.download_url = '';
  }

  let filename = '';
  let size = mod.size || '-';
  let resolved_download_url = '';

  const isDirectLink = mod.download_url && (
    mod.download_url.endsWith('.sporemod') ||
    mod.download_url.endsWith('.zip') ||
    mod.download_url.endsWith('.package') ||
    mod.download_url.endsWith('.dll') ||
    mod.download_url.includes('/releases/download/')
  );

  if (mod.name === '60FPS Patch') {
    filename = '60fps-patch';
    size = '1 KB';
    resolved_download_url = 'https://github.com/bisfranz/Spore-Mods-Collection/releases/tag/60FPS-Patch';
  } else if (isDirectLink) {
    resolved_download_url = mod.download_url;
    filename = mod.download_url.split('?')[0].split('/').pop();
  } else if (mod.github) {
    try {
      const result = await resolveGitHubAsset(mod.github, mod.updated_at);
      if (result) {
        ({ filename, size } = result);
        resolved_download_url = result.downloadUrl;
      }
    } catch (err) {
      console.warn(`Could not resolve GitHub release for ${mod.name}:`, err);
    }
  }

  if (!filename) {
    if (mod.download_url) {
      const parts = mod.download_url.split('/');
      filename = parts[parts.length - 1] || `${mod.name.replace(/\s+/g, '')}.sporemod`;
    } else if (mod.github) {
      const urlFilename = mod.github.split('?')[0].replace(/\/+$/, '').split('/').pop();
      if (urlFilename && (urlFilename.endsWith('.sporemod') || urlFilename.endsWith('.zip') || urlFilename.endsWith('.package') || urlFilename.endsWith('.dll'))) {
        filename = urlFilename;
      } else {
        const info = parseGithubInfo(mod.github);
        const nameBase = info ? (info.tag ? info.tag : info.repo) : mod.name.replace(/\s+/g, '');
        filename = `${nameBase}.sporemod`;
      }
    } else {
      filename = `${mod.name.replace(/\s+/g, '')}.sporemod`;
    }
    size = mod.size || '-';
  }

  if (mod.github && !resolved_download_url) {
    const info = parseGithubInfo(mod.github);
    if (info) {
      if (info.tag) {
        resolved_download_url = `https://github.com/${info.owner}/${info.repo}/releases/download/${info.tag}/${filename}`;
      } else {
        resolved_download_url = `https://github.com/${info.owner}/${info.repo}/releases/latest/download/${filename}`;
      }
    }
  }

  const targetBases = new Set();
  if (filename) targetBases.add(getNormalizedBase(filename));
  if (mod.name) targetBases.add(getNormalizedBase(mod.name));
  if (mod.github) {
    const parts = mod.github.split('/');
    const repoName = parts[parts.length - 1];
    if (repoName) targetBases.add(getNormalizedBase(repoName));
  }

  const candidates = new Set();
  if (filename) {
    candidates.add(filename.toLowerCase().trim());
    candidates.add(filename.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim());
  }
  if (mod.github) {
    const parts = mod.github.split('/');
    const repoName = parts[parts.length - 1]?.toLowerCase().trim();
    if (repoName) candidates.add(repoName);
  }
  if (mod.name) {
    candidates.add(mod.name.replace(/\s+/g, '').toLowerCase().trim());
  }

  let isDownloaded = downloadedFiles.includes(filename) && !filename.endsWith('.zip');
  if (!isDownloaded && filename) {
    const matchedFile = downloadedFiles.find(downloadedFile => {
      if (downloadedFile.endsWith('.zip')) return false;
      const dlBase = getNormalizedBase(downloadedFile);
      return targetBases.has(dlBase);
    });

    if (matchedFile) {
      isDownloaded = true;
      filename = matchedFile;
      candidates.add(filename.toLowerCase().trim());
      candidates.add(filename.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim());
    }
  }

  const isInstalledInManager = installedMods.some(installed => {
    if (candidates.has(installed.name.toLowerCase().trim())) return true;
    if (installed.uniqueName && candidates.has(installed.uniqueName.toLowerCase().trim())) return true;
    if (installed.files && installed.files.some(file => candidates.has(file.toLowerCase().trim()))) return true;

    // check with normalized base names to support exclamation mark prefixes and version mismatches
    if (targetBases.has(getNormalizedBase(installed.name))) return true;
    if (installed.uniqueName && targetBases.has(getNormalizedBase(installed.uniqueName))) return true;
    if (installed.files && installed.files.some(file => targetBases.has(getNormalizedBase(file)))) return true;

    return false;
  });

  let status = isInstalledInManager ? 'installed' : 'available';

  if (!isInstalledInManager && filename) {
    if (isDownloaded) {
      status = 'downloaded';
    } else {
      const getBaseName = (fname) => {
        let base = fname.replace(/\.(sporemod|zip|package)$/i, '');
        base = base.replace(/[-_]v?\d+(\.\d+)*$/i, '');
        base = base.replace(/v?\d+(\.\d+)+$/i, '');
        return base.toLowerCase().trim();
      };

      const latestBase = getBaseName(filename);
      const hasOlderVersion = downloadedFiles.some(f => {
        if (f === filename) return false;
        return getBaseName(f) === latestBase;
      });
      if (hasOlderVersion) {
        status = 'update';
      }
    }
  }

  let githubOwner = '';
  if (mod.github) {
    const info = parseGithubInfo(mod.github);
    if (info) githubOwner = info.owner;
  }
  if (!githubOwner && mod.download_url && mod.download_url.includes('github.com')) {
    const info = parseGithubInfo(mod.download_url);
    if (info) githubOwner = info.owner;
  }

  const displayAuthor = mod.author || githubOwner;

  return {
    ...mod,
    author: displayAuthor,
    github_owner: githubOwner,
    filename,
    size,
    resolved_download_url,
    status,
    isDownloaded,
  };
}
