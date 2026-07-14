import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { useLanguage } from './LanguageContext';
import { ModDataContext } from './ModDataContext';
import { formatDate } from '../utils/dateHelper';
import {
  evaluateProfileAchievements,
  evaluateModAchievements,
  evaluateGalaxyResetAchievements
} from '../utils/achievementRules';

const AchievementContext = createContext(null);

export const useAchievements = () => useContext(AchievementContext) || {};

export const AchievementProvider = ({ children }) => {
  const { user, profile, isOffline } = useAuth();
  const { addNotification, notifications, loadedUserId } = useNotification();
  const { t, language } = useLanguage();
  const modDataContext = useContext(ModDataContext);
  const mods = useMemo(() => modDataContext?.mods || [], [modDataContext?.mods]);

  const [unlockedAchievements, setUnlockedAchievements] = useState({});
  const [achievementsMeta, setAchievementsMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [achievementsUserId, setAchievementsUserId] = useState(null);
  const unlockingRef = useRef({});

  // Fetch achievements metadata definitions from Supabase
  const fetchAchievementsMeta = useCallback(async () => {
    // Attempt local cache first
    const cachedMeta = localStorage.getItem('sporenext_achievements_meta');
    if (cachedMeta) {
      try {
        setAchievementsMeta(JSON.parse(cachedMeta));
      } catch (e) {
        console.error("Error loading cached achievements metadata:", e);
      }
    }

    if (isOffline) return;

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*');

      if (!error && data && data.length > 0) {
        setAchievementsMeta(data);
        localStorage.setItem('sporenext_achievements_meta', JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Exception fetching achievements metadata from Supabase:", err);
    }
  }, [isOffline]);

  useEffect(() => {
    fetchAchievementsMeta();
  }, [fetchAchievementsMeta]);

  useEffect(() => {
    unlockingRef.current = {};
  }, [user?.id]);

  const initialValuesRef = useRef({
    userId: null,
    profile: null,
    mods: null,
    identities: null,
    notifications: null
  });

  useEffect(() => {
    if (isOffline || !user?.id || user.id === 'nomad') {
      initialValuesRef.current = { userId: null, profile: null, mods: null, identities: null, notifications: null };
      return;
    }

    if (initialValuesRef.current.userId !== user.id) {
      initialValuesRef.current = {
        userId: user.id,
        profile: profile && profile.id === user.id ? { ...profile } : null,
        mods: mods && mods.length > 0 ? [...mods] : null,
        identities: user.identities ? [...user.identities] : null,
        notifications: notifications ? [...notifications] : null
      };
      return;
    }

    if (!initialValuesRef.current.profile && profile && profile.id === user.id) {
      initialValuesRef.current.profile = { ...profile };
    }
    if (!initialValuesRef.current.mods && mods && mods.length > 0) {
      initialValuesRef.current.mods = [...mods];
    }
    if (!initialValuesRef.current.identities && user.identities) {
      initialValuesRef.current.identities = [...user.identities];
    }
    if (!initialValuesRef.current.notifications && notifications) {
      initialValuesRef.current.notifications = [...notifications];
    }
  }, [user, profile, mods, notifications, isOffline]);

  // load achievements from localStorage as fallback/cache
  const loadFromLocalStorage = useCallback((uId) => {
    if (isOffline || !uId || uId === 'nomad') {
      setUnlockedAchievements({});
      setAchievementsUserId(uId);
      return;
    }
    const saved = localStorage.getItem(`sporenext_achievements_${uId}`);
    if (saved) {
      try {
        setUnlockedAchievements(JSON.parse(saved));
        setAchievementsUserId(uId);
      } catch (e) {
        console.error("Error parsing local achievements:", e);
        setUnlockedAchievements({});
        setAchievementsUserId(uId);
      }
    } else {
      setUnlockedAchievements({});
      setAchievementsUserId(uId);
    }
  }, [isOffline]);

  // fetch own achievements from db
  const fetchOwnAchievements = useCallback(async (uId) => {
    if (isOffline || !uId || uId === 'nomad') {
      setUnlockedAchievements({});
      setAchievementsUserId(uId);
      setLoading(false);
      return;
    }

    const saved = localStorage.getItem(`sporenext_achievements_${uId}`);
    let localMapped = {};
    if (saved) {
      try {
        localMapped = JSON.parse(saved);
      } catch (e) {
        console.error("Error loading local achievements:", e);
      }
    }
    setUnlockedAchievements(localMapped);
    setAchievementsUserId(uId);

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', uId);

      if (error) {
        console.warn("Supabase user_achievements query failed (table might not exist yet). Falling back to localStorage:", error.message);
        loadFromLocalStorage(uId);
      } else if (data) {
        const mapped = {};
        data.forEach(item => {
          mapped[item.achievement_id] = { unlockedAt: formatDate(item.unlocked_at) };
        });
        setUnlockedAchievements(mapped);
        localStorage.setItem(`sporenext_achievements_${uId}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn("Exception fetching achievements from Supabase, falling back to localStorage:", err);
      loadFromLocalStorage(uId);
    } finally {
      setLoading(false);
    }
  }, [isOffline, loadFromLocalStorage]);

  // load achievements on user login/change
  useEffect(() => {
    const uId = user?.id || 'nomad';
    Promise.resolve().then(() => fetchOwnAchievements(uId));
  }, [user?.id, fetchOwnAchievements]);

  // fetch achievements of other users
  const fetchOtherUserAchievements = useCallback(async (targetUserId) => {
    if (!targetUserId) return {};
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', targetUserId);

      if (error) {
        console.warn("Failed to fetch achievements for user:", targetUserId, error.message);
        return {};
      }

      const mapped = {};
      if (data) {
        data.forEach(item => {
          mapped[item.achievement_id] = { unlockedAt: formatDate(item.unlocked_at) };
        });
      }
      return mapped;
    } catch (err) {
      console.warn("Exception fetching other user achievements:", err);
      return {};
    }
  }, []);

  // unlock achievement
  const unlockAchievement = useCallback(async (id) => {
    if (isOffline || !user?.id || user.id === 'nomad') return;
    const uId = user.id;

    // prevent unlocking if already unlocked in state or currently unlocking
    if (unlockedAchievements[id] || unlockingRef.current[id]) return;

    // sset lock immediately to prevent concurrent calls from inserting duplicates
    unlockingRef.current[id] = true;

    const unlockedAtStr = new Date().toISOString();
    const formattedDate = formatDate(unlockedAtStr);

    // update local state & local storage
    setUnlockedAchievements(prev => {
      const updated = { ...prev, [id]: { unlockedAt: formattedDate } };
      localStorage.setItem(`sporenext_achievements_${uId}`, JSON.stringify(updated));
      return updated;
    });

    // add UI notification
    const metaItem = achievementsMeta?.find(a => a.id === id);
    const achName = metaItem
      ? (language === 'en' ? metaItem.name_en : metaItem.name_es)
      : (t(`profile.achievements.${id}`) !== `profile.achievements.${id}` ? t(`profile.achievements.${id}`) : id);

    addNotification({
      type: 'achievement_unlocked',
      titleKey: 'notifications.achievement_unlocked',
      details: achName,
      achievementId: id
    });

    // save to database if online and user is logged in
    if (!isOffline && user?.id) {
      try {
        const { error } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: id,
            unlocked_at: unlockedAtStr
          });
        if (error) {
          const isDuplicate = error.code === '23505' || error.message?.includes('duplicate key') || error.status === 409;
          if (isDuplicate) {
            console.log(`Achievement ${id} is already registered in Supabase. Skipping insert warning.`);
          } else {
            console.warn("Failed to save achievement to Supabase:", error.message);
            unlockingRef.current[id] = false;
          }
        }
      } catch (e) {
        console.warn("Exception saving achievement to Supabase:", e);
        unlockingRef.current[id] = false;
      }
    }
  }, [user, unlockedAchievements, addNotification, isOffline, t]);

  const asyncUnlock = useCallback((id) => {
    Promise.resolve().then(() => unlockAchievement(id));
  }, [unlockAchievement]);

  // Profile and identity based achievs
  useEffect(() => {
    evaluateProfileAchievements({
      user,
      profile,
      unlockedAchievements,
      unlockAchievement: asyncUnlock,
      initialProfile: initialValuesRef.current.profile,
      initialIdentities: initialValuesRef.current.identities,
      isOffline,
      loading,
      achievementsUserId
    });

    // sync profile properties for subsequent checks
    if (!loading && achievementsUserId === user?.id && !isOffline && user?.id && user.id !== 'nomad' && profile && profile.id === user.id) {
      initialValuesRef.current.profile = { ...profile };
      if (user.identities) {
        initialValuesRef.current.identities = [...user.identities];
      }
    }
  }, [user, profile, unlockedAchievements, asyncUnlock, isOffline, loading, achievementsUserId]);

  // mod based achievements
  useEffect(() => {
    evaluateModAchievements({
      user,
      mods,
      unlockedAchievements,
      unlockAchievement: asyncUnlock,
      initialMods: initialValuesRef.current.mods,
      isOffline,
      loading,
      achievementsUserId
    });

    // sync mods list
    if (!loading && achievementsUserId === user?.id && !isOffline && user?.id && user.id !== 'nomad' && mods && mods.length > 0) {
      initialValuesRef.current.mods = [...mods];
    }
  }, [user, mods, unlockedAchievements, asyncUnlock, isOffline, loading, achievementsUserId]);

  // galaxy reset achievement (listening to notifications)
  useEffect(() => {
    evaluateGalaxyResetAchievements({
      user,
      notifications,
      unlockedAchievements,
      unlockAchievement: asyncUnlock,
      initialNotifications: initialValuesRef.current.notifications,
      loadedUserId,
      isOffline,
      loading,
      achievementsUserId
    });

    // sync notifications
    if (!loading && achievementsUserId === user?.id && !isOffline && user && user.id !== 'nomad' && notifications && initialValuesRef.current.notifications && loadedUserId === user.id) {
      initialValuesRef.current.notifications = [...notifications];
    }
  }, [user, notifications, unlockedAchievements, asyncUnlock, loadedUserId, isOffline, loading, achievementsUserId]);

  return (
    <AchievementContext.Provider
      value={{
        unlockedAchievements,
        achievementsMeta,
        loading,
        unlockAchievement,
        fetchOtherUserAchievements,
        fetchOwnAchievements
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
};
