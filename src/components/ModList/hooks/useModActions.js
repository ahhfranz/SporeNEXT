import { useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useNotification } from '../../../context/NotificationContext';
import { supabase } from '../../../lib/supabase';

const activeActions = new Set();

export function useModActions({
  mods,
  updateMods,
  likedMods,
  updateLikedMods,
  setDownloadProgresses,
  setErrorModal,
  setComponentsModal,
}) {
  const { user, isNetworkOnline } = useAuth();
  const { t } = useLanguage();
  const { addNotification } = useNotification();
  const activeLikesRef = useRef(new Set());

  const getFriendlyErrorMessage = (err, fallbackKey) => {
    const msg = err?.message || '';
    if (msg.includes('Spore GA not installed') || msg.includes('Spore Galactic Adventures is not installed')) {
      return t('mods.gameNotInstalledError');
    }
    return `${t(fallbackKey) || t('mods.errorDefaultTitle') || 'Error'}: ${msg}`;
  };

  const handleLike = async (id) => {
    if (!isNetworkOnline) {
      addNotification({
        type: 'error',
        titleKey: 'notifications.offline_error',
        details: t('mods.offlineActionError')
      });
      return;
    }
    if (!user) {
      return;
    }

    if (activeLikesRef.current.has(id)) {
      return;
    }
    activeLikesRef.current.add(id);

    const wasLiked = !!likedMods[id];

    updateLikedMods(prev => ({ ...prev, [id]: !wasLiked }));
    updateMods(prev => prev.map(m =>
      m.id === id ? { ...m, likes: Math.max(0, (m.likes || 0) + (wasLiked ? -1 : 1)) } : m
    ));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('mod_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('mod_id', id);

        if (error) throw error;
      } else {
        const { error, status } = await supabase
          .from('mod_likes')
          .insert({ user_id: user.id, mod_id: id });

        if (error) {
          const isConflict = status === 409 || error.status === 409 || error.code === '23505' || error.message?.includes('409') || error.message?.includes('duplicate key');
          if (isConflict) {

            updateLikedMods(prev => ({ ...prev, [id]: true }));
            return;
          }
          throw error;
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      updateLikedMods(prev => ({ ...prev, [id]: wasLiked }));
      updateMods(prev => prev.map(m =>
        m.id === id ? { ...m, likes: Math.max(0, (m.likes || 0) + (wasLiked ? 1 : -1)) } : m
      ));
    } finally {
      activeLikesRef.current.delete(id);
    }
  };

  const handleAction = async (id, currentStatus) => {
    if (activeActions.has(id)) {
      return;
    }
    activeActions.add(id);

    try {
      const mod = mods.find(m => m.id === id);
      if (!mod) return;

      const hasSource = (mod.github && mod.github.trim() !== '') || (mod.download_url && mod.download_url.trim() !== '');

      if (currentStatus === 'available') {
        if (!hasSource) {
          setErrorModal({
            isOpen: true,
            title: t('mods.errorTitle'),
            message: t('mods.noSourceError')
          });
          return;
        }
        setDownloadProgresses(prev => ({ ...prev, [id]: { percent: 0, status: 'downloading' } }));

        // cooldown for downloads
        let shouldIncrement = true;
        try {
          const stored = localStorage.getItem('sporenext_last_downloads');
          const lastDownloads = stored ? JSON.parse(stored) : {};
          const lastTime = lastDownloads[id];
          if (lastTime && (Date.now() - lastTime < 5 * 60 * 1000)) {
            shouldIncrement = false;
          } else {
            lastDownloads[id] = Date.now();
            localStorage.setItem('sporenext_last_downloads', JSON.stringify(lastDownloads));
          }
        } catch (e) {
        }

        if (shouldIncrement) {
          supabase
            .rpc('increment_mod_downloads', { mod_id: id })
            .then(({ error: rpcError }) => {
              if (rpcError) {
                return supabase
                  .from('mods')
                  .update({ downloads: (mod.downloads || 0) + 1 })
                  .eq('id', id)
                  .select();
              } else {
                updateMods(prev => prev.map(m => m.id === id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));
                return null;
              }
            })
            .then((res) => {
              if (res) {
                const { data, error } = res;
                if (error) {
                } else if (data) {
                  updateMods(prev => prev.map(m => m.id === id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));
                }
              }
            })
            .catch(() => { });
        }

        try {
          if (window.electronAPI?.downloadMod) {
            const res = await window.electronAPI.downloadMod(id, {
              name: mod.name,
              filename: mod.filename,
              github: mod.github,
              downloadUrl: mod.resolved_download_url || mod.download_url,
            });

            const finalFilename = res && res.filename ? res.filename : mod.filename;
            const finalPath = res && res.filePath ? res.filePath : finalFilename;

            updateMods(prev => prev.map(m => m.id === id ? {
              ...m,
              filename: finalFilename,
              isDownloaded: true,
              status: 'downloaded'
            } : m));

            addNotification({
              type: 'download_success',
              titleKey: 'notifications.download_success',
              details: `${mod.name} (${finalPath})`
            });
          } else {
            let progress = 0;
            const interval = setInterval(() => {
              progress += 10;
              setDownloadProgresses(prev => ({ ...prev, [id]: { percent: progress, status: 'downloading' } }));
              if (progress >= 100) {
                clearInterval(interval);
                updateMods(prev => prev.map(m => m.id === id ? { ...m, isDownloaded: true, status: 'downloaded' } : m));

                addNotification({
                  type: 'download_success',
                  titleKey: 'notifications.download_success',
                  details: `${mod.name} (browser_download/${mod.filename})`
                });

                setTimeout(() => setDownloadProgresses(prev => {
                  const copy = { ...prev }; delete copy[id]; return copy;
                }), 500);
              }
            }, 150);
          }
        } catch (err) {
          setErrorModal({
            isOpen: true,
            title: t('mods.errorTitle'),
            message: getFriendlyErrorMessage(err, 'mods.downloadError')
          });
        } finally {
          if (window.electronAPI?.downloadMod) {
            setDownloadProgresses(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
          }
        }
      } else if (currentStatus === 'downloaded') {
        let selectedIndices = null;
        try {
          if (window.electronAPI?.getModComponents) {
            const compInfo = await window.electronAPI.getModComponents(mod.filename);
            if (compInfo && compInfo.hasComponents) {
              selectedIndices = await new Promise((resolve) => {
                setComponentsModal({
                  isOpen: true,
                  mod,
                  componentsInfo: compInfo,
                  resolve
                });
              });

              setComponentsModal({ isOpen: false, mod: null, componentsInfo: null, resolve: null });

              if (selectedIndices === null) {
                return;
              }
            }
          }
        } catch (err) {
        }

        setDownloadProgresses(prev => ({ ...prev, [id]: { percent: 100, status: 'installing' } }));
        try {
          if (window.electronAPI?.modInstall) {
            await window.electronAPI.modInstall(mod.filename, selectedIndices);
          }
          updateMods(prev => prev.map(m => m.id === id ? { ...m, status: 'installed' } : m));

          addNotification({
            type: 'install_success',
            titleKey: 'notifications.install_success',
            details: mod.name
          });
        } catch (err) {
          setErrorModal({
            isOpen: true,
            title: t('mods.errorTitle'),
            message: getFriendlyErrorMessage(err, 'mods.installError')
          });
        } finally {
          setDownloadProgresses(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
        }
      } else if (currentStatus === 'update') {
        if (!hasSource) {
          setErrorModal({
            isOpen: true,
            title: t('mods.errorTitle'),
            message: t('mods.noSourceError')
          });
          return;
        }
        setDownloadProgresses(prev => ({ ...prev, [id]: { percent: 0, status: 'downloading' } }));
        try {
          if (window.electronAPI?.downloadMod) {
            await window.electronAPI.downloadMod(id, {
              name: mod.name,
              filename: mod.filename,
              github: mod.github,
              downloadUrl: mod.resolved_download_url || mod.download_url,
            });

            setDownloadProgresses(prev => ({ ...prev, [id]: { percent: 100, status: 'installing' } }));

            if (window.electronAPI.modUpdate) {
              await window.electronAPI.modUpdate(mod.filename);
            }
            updateMods(prev => prev.map(m => m.id === id ? { ...m, isDownloaded: true, status: 'installed' } : m));

            addNotification({
              type: 'install_success',
              titleKey: 'notifications.install_success',
              details: mod.name
            });
          } else {
            let progress = 0;
            const interval = setInterval(() => {
              progress += 10;
              setDownloadProgresses(prev => ({ ...prev, [id]: { percent: progress, status: 'downloading' } }));
              if (progress >= 100) {
                clearInterval(interval);
                updateMods(prev => prev.map(m => m.id === id ? { ...m, isDownloaded: true, status: 'installed' } : m));
                setTimeout(() => setDownloadProgresses(prev => {
                  const copy = { ...prev }; delete copy[id]; return copy;
                }), 500);
              }
            }, 150);
          }
        } catch (err) {
          setErrorModal({
            isOpen: true,
            title: t('mods.errorTitle'),
            message: getFriendlyErrorMessage(err, 'mods.updateError')
          });
        } finally {
          setDownloadProgresses(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
        }
      } else if (currentStatus === 'installed') {
        setDownloadProgresses(prev => ({ ...prev, [id]: { percent: 0, status: 'uninstalling' } }));

        try {
          if (window.electronAPI?.modUninstall) {
            const cliName = mod.filename.replace(/\.(sporemod|zip|package)$/i, '');
            await window.electronAPI.modUninstall(cliName, mod);
          }
          let isDownloaded = false;
          if (window.electronAPI?.getDownloadedFiles) {
            try {
              const downloadedFiles = await window.electronAPI.getDownloadedFiles();
              isDownloaded = downloadedFiles.includes(mod.filename);
              if (!isDownloaded && mod.filename) {
                const getNormalizedBase = (fname) => {
                  return fname
                    .toLowerCase()
                    .replace(/\.(sporemod|zip|package)$/i, '')
                    .replace(/^!+/, '')
                    .replace(/[-_]v?\d+(\.\d+)*$/i, '')
                    .replace(/v?\d+(\.\d+)+$/i, '')
                    .replace(/\s+/g, '')
                    .trim();
                };
                const targetBases = new Set();
                targetBases.add(getNormalizedBase(mod.filename));
                if (mod.name) targetBases.add(getNormalizedBase(mod.name));
                if (mod.github) {
                  const parts = mod.github.split('/');
                  const repoName = parts[parts.length - 1];
                  if (repoName) targetBases.add(getNormalizedBase(repoName));
                }
                const matchedFile = downloadedFiles.find(downloadedFile => {
                  const dlBase = getNormalizedBase(downloadedFile);
                  return targetBases.has(dlBase);
                });
                if (matchedFile) {
                  isDownloaded = true;
                }
              }
            } catch (e) {
            }
          }
          updateMods(prev => prev.map(m => m.id === id ? { ...m, isDownloaded, status: isDownloaded ? 'downloaded' : 'available' } : m));

          addNotification({
            type: 'uninstall_success',
            titleKey: 'notifications.uninstall_success',
            details: mod.name
          });
        } catch (err) {
          setErrorModal({
            isOpen: true,
            title: t('mods.errorTitle'),
            message: getFriendlyErrorMessage(err, 'mods.uninstallError')
          });
        } finally {
          setDownloadProgresses(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
        }
      }
    } finally {
      activeActions.delete(id);
    }
  };

  return {
    handleLike,
    handleAction,
  };
}
