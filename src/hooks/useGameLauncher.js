import { useState, useEffect, useCallback, useRef } from 'react';

const defaultInstalledGames = {
  sporega: { installed: false, path: null, version: null }
};
const defaultActiveLaunch = {
  game: null,
  status: 'idle'
};

let globalInstalledGames = defaultInstalledGames;
let globalActiveLaunch = defaultActiveLaunch;

export function useGameLauncher() {
  const [installedGames, setInstalledGames] = useState(globalInstalledGames);
  const [activeLaunch, setActiveLaunch] = useState(globalActiveLaunch);
  const [error, setError] = useState(null);

  const launchTimeoutRef = useRef(null);

  const updateInstalledGames = useCallback((val) => {
    globalInstalledGames = val;
    setInstalledGames(val);
  }, []);

  const updateActiveLaunch = useCallback((valOrFn) => {
    setActiveLaunch(prev => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      globalActiveLaunch = nextVal;
      return nextVal;
    });
  }, []);

  // check if game is installed
  const detectInstalledGames = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.detectGames) {
        const detection = await window.electronAPI.detectGames();
        updateInstalledGames(detection);
        return detection;
      }
    } catch (err) {
      console.error('Error detecting games:', err);
      setError(err.message);
    }
    return null;
  }, [updateInstalledGames]);

  // poll game process running state
  const checkGameRunning = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.checkGameRunning) {
        const { running } = await window.electronAPI.checkGameRunning();

        updateActiveLaunch(prev => {
          // if it is running:
          if (running) {
            if (prev.status === 'idle') {
              return { game: 'sporega', status: 'playing' };
            }
            if (prev.status === 'launching') {
              // clear launch timeout
              if (launchTimeoutRef.current) {
                clearTimeout(launchTimeoutRef.current);
                launchTimeoutRef.current = null;
              }
              return { ...prev, status: 'playing' };
            }
            return prev; // already playing or launching
          } else {
            // if it is not running:
            if (prev.status === 'playing') {
              return { game: null, status: 'idle' };
            }
            return prev; // if idle or launching, let launching handle its timeout
          }
        });
      }
    } catch (err) {
      console.error('Error checking game running status:', err);
    }
  }, [updateActiveLaunch]);

  // launch game
  const launchGame = useCallback(async (gameName = 'sporega') => {
    if (activeLaunch.status !== 'idle') return;

    setError(null);
    updateActiveLaunch({ game: gameName, status: 'launching' });

    try {
      if (window.electronAPI && window.electronAPI.launchGame) {
        await window.electronAPI.launchGame(gameName);

        // start a timeout of 15 secs, if the game fails to start running, reset to idle
        if (launchTimeoutRef.current) clearTimeout(launchTimeoutRef.current);
        launchTimeoutRef.current = setTimeout(() => {
          updateActiveLaunch(prev => {
            if (prev.status === 'launching') {
              setError('Game failed to start in time.');
              return { game: null, status: 'idle' };
            }
            return prev;
          });
        }, 15000);
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      console.error(`Error launching game ${gameName}:`, err);
      setError(err.message);
      updateActiveLaunch({ game: null, status: 'idle' });
    }
  }, [activeLaunch.status, updateActiveLaunch]);

  // close game process
  const closeGame = useCallback(async () => {
    setError(null);
    try {
      if (window.electronAPI && window.electronAPI.killGame) {
        const res = await window.electronAPI.killGame();
        if (res && res.success) {
          if (launchTimeoutRef.current) {
            clearTimeout(launchTimeoutRef.current);
            launchTimeoutRef.current = null;
          }
          updateActiveLaunch({ game: null, status: 'idle' });
        } else {
          throw new Error(res ? res.error : 'Failed to kill game');
        }
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      console.error('Error closing game:', err);
      setError(err.message);
    }
  }, [updateActiveLaunch]);

  // detect games on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      detectInstalledGames();
    });
  }, [detectInstalledGames]);

  // setup periodic polling for game running status
  useEffect(() => {
    Promise.resolve().then(() => {
      checkGameRunning();
    });

    const interval = setInterval(() => {
      checkGameRunning();
    }, 3000);

    return () => {
      clearInterval(interval);
      if (launchTimeoutRef.current) clearTimeout(launchTimeoutRef.current);
    };
  }, [checkGameRunning]);

  return {
    installedGames,
    activeLaunch,
    launchGame,
    closeGame,
    error,
    detectInstalledGames
  };
}
