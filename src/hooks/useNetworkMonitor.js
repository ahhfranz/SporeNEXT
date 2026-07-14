import { useState, useEffect } from 'react';
import { supabase, supabaseAnonKey } from '../lib/supabase';

export function useNetworkMonitor(userRef) {
  const [onlineCount, setOnlineCount] = useState(1);
  const [isOffline, setIsOffline] = useState(() => {
    return localStorage.getItem('sporenext_offline_mode') === 'true';
  });
  const [isNetworkOnline, setIsNetworkOnline] = useState(() => {
    return navigator.onLine;
  });

  useEffect(() => {
    let active = true;
    let checkInterval = null;
    let lastActiveUpdate = 0;
    let lastCountFetch = 0;
    let isWindowFocused = true;
    let prevOnlineState = navigator.onLine;

    const performPingCheck = async () => {
      if (!isWindowFocused) {
        return;
      }

      if (!navigator.onLine) {
        if (active) setIsNetworkOnline(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${supabase.supabaseUrl}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const online = res.status >= 200 && res.status < 500;
        if (active && online !== prevOnlineState) {
          prevOnlineState = online;
          setIsNetworkOnline(online);
        }

        if (online && active && localStorage.getItem('sporenext_offline_mode') !== 'true') {
          const now = Date.now();
          const currentUser = userRef.current;

          // periodically update current user last_active_at
          if (currentUser && now - lastActiveUpdate > 9 * 60 * 1000) {
            lastActiveUpdate = now;
            supabase
              .from('profiles')
              .update({ last_active_at: new Date().toISOString() })
              .eq('id', currentUser.id)
              .then(({ error }) => {
                if (error) console.error('Failed to update last_active_at in heartbeat:', error.message);
              });
          }

          // fetch the exact count of active users (at most once every 10 minutes)
          if (now - lastCountFetch > 10 * 60 * 1000) {
            lastCountFetch = now;
            const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString();
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .gt('last_active_at', fifteenMinutesAgo)
              .then(({ count, error }) => {
                if (!error && count !== null && active) {
                  setOnlineCount(count > 0 ? count : 1);
                }
              });
          }
        }
      } catch {
        if (active && prevOnlineState !== false) {
          prevOnlineState = false;
          setIsNetworkOnline(false);
        }
      }
    };

    const handleOnline = () => {
      performPingCheck();
    };

    const handleOffline = () => {
      if (active && prevOnlineState !== false) {
        prevOnlineState = false;
        setIsNetworkOnline(false);
      }
    };

    const handleFocus = () => {
      isWindowFocused = true;
      performPingCheck();
    };

    const handleBlur = () => {
      isWindowFocused = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // initial check
    performPingCheck();

    // hb every 10 mins
    checkInterval = setInterval(performPingCheck, 10 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(checkInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [userRef]);

  return {
    onlineCount,
    isOffline,
    setIsOffline,
    isNetworkOnline,
    setIsNetworkOnline
  };
}
