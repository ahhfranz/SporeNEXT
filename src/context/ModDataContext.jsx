import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import ErrorModal from '../components/ErrorModal/ErrorModal';
import { enrichMod, getNormalizedBase } from '../utils/modHelper';
import { useModActions } from '../components/ModList/hooks/useModActions';

export const ModDataContext = createContext(null);

let globalModsCache = null;
let globalLikesCache = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 mins

export function ModDataProvider({ children }) {
  const { user, isNetworkOnline } = useAuth();
  const [mods, setMods] = useState(() => globalModsCache || []);
  const [likedMods, setLikedMods] = useState(() => globalLikesCache || {});
  const [downloadProgresses, setDownloadProgresses] = useState({});
  const [loading, setLoading] = useState(() => !globalModsCache);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [componentsModal, setComponentsModal] = useState({ isOpen: false, mod: null, componentsInfo: null, resolve: null });

  const updateMods = (nextValOrFn) => {
    setMods(prev => {
      const nextVal = typeof nextValOrFn === 'function' ? nextValOrFn(prev) : nextValOrFn;
      globalModsCache = nextVal;
      return nextVal;
    });
  };

  const updateLikedMods = (nextValOrFn) => {
    setLikedMods(prev => {
      const nextVal = typeof nextValOrFn === 'function' ? nextValOrFn(prev) : nextValOrFn;
      globalLikesCache = nextVal;
      return nextVal;
    });
  };

  const loadMods = useCallback(async (signal, forceLoading = false) => {
    const cacheTime = localStorage.getItem('sporenext_mods_cache_time');
    const cachedModsRaw = localStorage.getItem('sporenext_mods_cache');
    const isCacheValid = !forceLoading && cachedModsRaw && cacheTime && (Date.now() - Number(cacheTime) < CACHE_TTL_MS);

    // if cache is valid and we already have mods in memory, skip the entire fetch
    if (isCacheValid && globalModsCache && globalModsCache.length > 0) {
      if (!signal?.aborted) setLoading(false);
      return;
    }

    // prevent rapid fetches
    const now = Date.now();
    if (!forceLoading && now - lastFetchTimestamp < 30 * 1000 && globalModsCache) {
      if (!signal?.aborted) setLoading(false);
      return;
    }

    if ((!globalModsCache && !isCacheValid) || forceLoading) {
      setLoading(true);
    }
    try {
      let fetchedMods = null;
      let isFetchedSuccessfully = false;
      let likesMap = {};

      if (isNetworkOnline && !isCacheValid) {
        lastFetchTimestamp = Date.now();
        try {
          const { data, error } = await supabase.from('mods').select('*');
          if (error) {
            console.error('Error fetching mods from Supabase:', error.message);
          } else if (data) {
            fetchedMods = data;
            isFetchedSuccessfully = true;
          }
        } catch (e) {
          console.error('Exception fetching mods from Supabase:', e);
        }
      }

      let downloadedFiles = [];
      let installedMods = [];
      if (window.electronAPI) {
        try {
          if (window.electronAPI.getDownloadedFiles) {
            downloadedFiles = await window.electronAPI.getDownloadedFiles();
          }
          if (window.electronAPI.modListInstalled) {
            installedMods = await window.electronAPI.modListInstalled();
          }
        } catch (e) {
          console.error('Failed to get downloaded files or active mods:', e);
        }
      }

      if (signal?.aborted) return;

      if (isFetchedSuccessfully && fetchedMods) {
        const enriched = await Promise.all(
          fetchedMods.map(mod => enrichMod(mod, downloadedFiles, installedMods))
        );

        if (signal?.aborted) return;

        const githubOwners = Array.from(
          new Set(
            enriched
              .map(m => m.github_owner)
              .filter(owner => typeof owner === 'string' && owner.trim() !== '')
          )
        );

        let profileMap = {};
        if (githubOwners.length > 0) {
          try {
            const { data: profilesData, error: rpcError } = await supabase
              .rpc('find_profiles_by_github_usernames', { github_usernames: githubOwners })
              .select('id, username, display_name, avatar_url, role, country, last_active_at, created_at');

            if (!rpcError && profilesData) {
              profilesData.forEach(p => {
                if (p.github_username) {
                  profileMap[p.github_username.toLowerCase()] = {
                    id: p.id,
                    username: p.username,
                    display_name: p.display_name,
                    avatar_url: p.avatar_url,
                    description: null,
                    role: p.role,
                    banner_url: null,
                    banner_position_y: p.banner_position_y ?? 50,
                    country: p.country,
                    last_active_at: p.last_active_at,
                    created_at: p.created_at
                  };
                }
              });
            } else if (rpcError) {
              console.error('Error fetching profiles by github usernames:', rpcError.message);
            }
          } catch (e) {
            console.error('Failed to fetch github profiles:', e);
          }
        }

        const finalMods = enriched.map(m => {
          const ownerKey = m.github_owner ? m.github_owner.toLowerCase() : '';
          return {
            ...m,
            github_profile: profileMap[ownerKey] || null
          };
        });

        if (user) {
          try {
            const { data: userLikes, error: likesError } = await supabase
              .from('mod_likes')
              .select('mod_id')
              .eq('user_id', user.id);

            if (!likesError && userLikes) {
              userLikes.forEach(like => {
                likesMap[like.mod_id] = true;
              });
            }
          } catch (e) {
            console.error('Failed to load user likes:', e);
          }
        }

        try {
          localStorage.setItem('sporenext_mods_cache', JSON.stringify(finalMods));
          lastFetchTimestamp = Date.now();
          localStorage.setItem('sporenext_mods_cache_time', Date.now().toString());
          if (user) {
            localStorage.setItem(`sporenext_likes_cache_${user.id}`, JSON.stringify(likesMap));
          }
        } catch (e) {
          console.warn('Failed to save mods or likes to cache:', e);
        }

        updateLikedMods(likesMap);
        updateMods(finalMods);
      } else {
        console.log('Loading mods from local cache...');
        const cachedModsRaw = localStorage.getItem('sporenext_mods_cache');
        let cachedMods = [];
        if (cachedModsRaw) {
          try {
            cachedMods = JSON.parse(cachedModsRaw);
          } catch (e) {
            console.error('Error parsing cached mods:', e);
          }
        }

        if (user) {
          const cachedLikesRaw = localStorage.getItem(`sporenext_likes_cache_${user.id}`);
          if (cachedLikesRaw) {
            try {
              likesMap = JSON.parse(cachedLikesRaw);
            } catch (e) {
              console.error('Error parsing cached likes:', e);
            }
          }
        }

        const finalMods = cachedMods.map(mod => {
          const targetBases = new Set();
          if (mod.filename) targetBases.add(getNormalizedBase(mod.filename));
          if (mod.name) targetBases.add(getNormalizedBase(mod.name));
          if (mod.github) {
            const parts = mod.github.split('/');
            const repoName = parts[parts.length - 1];
            if (repoName) targetBases.add(getNormalizedBase(repoName));
          }

          const candidates = new Set();
          if (mod.filename) {
            candidates.add(mod.filename.toLowerCase().trim());
            candidates.add(mod.filename.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim());
          }
          if (mod.github) {
            const parts = mod.github.split('/');
            const repoName = parts[parts.length - 1]?.toLowerCase().trim();
            if (repoName) candidates.add(repoName);
          }
          if (mod.name) {
            candidates.add(mod.name.replace(/\s+/g, '').toLowerCase().trim());
          }

          let isDownloaded = downloadedFiles.includes(mod.filename) && !mod.filename.endsWith('.zip');
          if (!isDownloaded && mod.filename) {
            const matchedFile = downloadedFiles.find(downloadedFile => {
              if (downloadedFile.endsWith('.zip')) return false;
              const dlBase = getNormalizedBase(downloadedFile);
              return targetBases.has(dlBase);
            });

            if (matchedFile) {
              isDownloaded = true;
              mod.filename = matchedFile;
              candidates.add(mod.filename.toLowerCase().trim());
              candidates.add(mod.filename.replace(/\.(sporemod|zip|package)$/i, '').toLowerCase().trim());
            }
          }

          const isInstalledInManager = installedMods.some(installed => {
            if (candidates.has(installed.name.toLowerCase().trim())) return true;
            if (installed.uniqueName && candidates.has(installed.uniqueName.toLowerCase().trim())) return true;
            if (installed.files && installed.files.some(file => candidates.has(file.toLowerCase().trim()))) return true;

            if (targetBases.has(getNormalizedBase(installed.name))) return true;
            if (installed.uniqueName && targetBases.has(getNormalizedBase(installed.uniqueName))) return true;
            if (installed.files && installed.files.some(file => targetBases.has(getNormalizedBase(file)))) return true;

            return false;
          });

          let status = isInstalledInManager ? 'installed' : 'available';
          if (!isInstalledInManager && mod.filename) {
            if (isDownloaded) {
              status = 'downloaded';
            } else {
              const getBaseName = (fname) => {
                let base = fname.replace(/\.(sporemod|zip|package)$/i, '');
                base = base.replace(/[-_]v?\d+(\.\d+)*$/i, '');
                base = base.replace(/v?\d+(\.\d+)+$/i, '');
                return base.toLowerCase().trim();
              };

              const latestBase = getBaseName(mod.filename);
              const hasOlderVersion = downloadedFiles.some(f => {
                if (f === mod.filename) return false;
                return getBaseName(f) === latestBase;
              });
              if (hasOlderVersion) {
                status = 'update';
              }
            }
          }

          return {
            ...mod,
            status,
            isDownloaded
          };
        });

        updateLikedMods(likesMap);
        updateMods(finalMods);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Exception fetching mods:', err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user, isNetworkOnline]);


  const loadModsRef = useRef(loadMods);
  useEffect(() => {
    loadModsRef.current = loadMods;
  }, [loadMods]);

  const reloadMods = () => loadModsRef.current(undefined, true);
  const reloadModsSilent = () => loadModsRef.current(undefined, false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadModsRef.current(controller.signal, false);
      }
    });
    return () => controller.abort();

  }, []);

  useEffect(() => {
    if (!user || !user.id || !isNetworkOnline) {
      if (!user) updateLikedMods({});
      return;
    }

    let isMounted = true;
    const fetchUserLikes = async () => {
      try {
        const { data: userLikes, error: likesError } = await supabase
          .from('mod_likes')
          .select('mod_id')
          .eq('user_id', user.id);

        if (!likesError && userLikes && isMounted) {
          const likesMap = {};
          userLikes.forEach(like => {
            likesMap[like.mod_id] = true;
          });
          updateLikedMods(likesMap);
          try {
            localStorage.setItem(`sporenext_likes_cache_${user.id}`, JSON.stringify(likesMap));
          } catch (e) {
            console.warn('Failed to save likes cache:', e);
          }
        }
      } catch (e) {
        console.error('Failed to load user likes:', e);
      }
    };

    fetchUserLikes();

    return () => {
      isMounted = false;
    };
  }, [user?.id, isNetworkOnline]);

  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return;

    const unsubscribe = window.electronAPI.onDownloadProgress(({ modId, percent, status, error }) => {
      setDownloadProgresses(prev => ({ ...prev, [modId]: { percent, status, error } }));

      if (status === 'failed') {
        console.error(`Download failed for mod ${modId}: ${error}`);
        setTimeout(() => setDownloadProgresses(prev => {
          const copy = { ...prev }; delete copy[modId]; return copy;
        }), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const { handleLike, handleAction } = useModActions({
    mods,
    updateMods,
    likedMods,
    updateLikedMods,
    setDownloadProgresses,
    setErrorModal,
    setComponentsModal,
  });

  return (
    <ModDataContext.Provider
      value={{
        mods,
        likedMods,
        downloadProgresses,
        loading,
        loadMods: reloadMods,
        loadModsSilent: reloadModsSilent,
        handleLike,
        handleAction,
        componentsModal,
        setComponentsModal,
      }}
    >
      {children}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
      />
    </ModDataContext.Provider>
  );
}
