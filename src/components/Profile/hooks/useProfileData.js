import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import defaultAvatar from '../../../assets/default_avatar.png';

export function useProfileData({
  user,
  profile,
  isOffline,
  isNetworkOnline,
  fetchProfile,
  fetchOwnAchievements,
  fetchOtherUserAchievements,
  refreshProfile,
  profileViewTarget,
  t
}) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [selectedAchievements, setSelectedAchievements] = useState({});
  const [isLoadingOtherProfile, setIsLoadingOtherProfile] = useState(false);
  const [isBannerImageLoading, setIsBannerImageLoading] = useState(false);
  const [prevTarget, setPrevTarget] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  if (profileViewTarget !== prevTarget) {
    setPrevTarget(profileViewTarget);
    const targetProfile = profileViewTarget?.id === user?.id ? null : profileViewTarget;
    if (targetProfile?.id !== selectedProfile?.id) {
      setSelectedProfile(targetProfile);
      if (targetProfile) {
        setIsLoadingOtherProfile(true);
      } else {
        setIsLoadingOtherProfile(false);
      }
    }
  }

  const loadOtherProfileData = useCallback(async (targetId, activeRef = { current: true }) => {
    if (!targetId || isOffline) return;
    try {
      const [profileData, providersRes, achievementsData] = await Promise.all([
        fetchProfile ? fetchProfile(targetId) : null,
        supabase.rpc('get_user_providers', { target_user_id: targetId }),
        fetchOtherUserAchievements ? fetchOtherUserAchievements(targetId) : {}
      ]);

      if (!activeRef.current) return;

      if (profileData) {
        setSelectedProfile(profileData);
      }
      if (providersRes && !providersRes.error && providersRes.data) {
        setSelectedProviders(providersRes.data.map(p => ({
          provider: p.provider,
          id: p.provider_user_id,
          username: p.provider_username
        })));
      } else {
        setSelectedProviders([]);
      }
      if (achievementsData) {
        setSelectedAchievements(achievementsData);
      } else {
        setSelectedAchievements({});
      }
    } catch (err) {
    }
  }, [isOffline, fetchProfile, fetchOtherUserAchievements]);

  const selectedProfileId = selectedProfile?.id;
  useEffect(() => {
    if (selectedProfileId && !isOffline) {
      const active = { current: true };
      const run = async () => {
        await loadOtherProfileData(selectedProfileId, active);
        if (active.current) {
          setIsLoadingOtherProfile(false);
        }
      };

      const timeoutId = setTimeout(run, 0);
      return () => {
        active.current = false;
        clearTimeout(timeoutId);
      };
    }
  }, [selectedProfileId, isOffline, loadOtherProfileData]);

  const isViewingOthers = selectedProfile !== null;
  const activeProfile = isViewingOthers ? selectedProfile : profile;

  useEffect(() => {
    const checkOnline = () => {
      let targetOnline = true;
      if (!isNetworkOnline) {
        targetOnline = false;
      } else if (!isViewingOthers) {
        targetOnline = true;
      } else if (activeProfile && activeProfile.last_active_at) {
        const lastActive = new Date(activeProfile.last_active_at).getTime();
        targetOnline = lastActive > Date.now() - 180000;
      } else {
        targetOnline = false;
      }
      setIsOnline(targetOnline);
    };

    const timeoutId = setTimeout(checkOnline, 0);
    return () => clearTimeout(timeoutId);
  }, [activeProfile, isNetworkOnline, isViewingOthers]);

  // Connected providers calculation
  const connectedProviders = useMemo(() => {
    if (!isViewingOthers) {
      const providers = [];
      const discordIdObj = user?.identities?.find(id => id.provider === 'discord');
      const githubIdObj = user?.identities?.find(id => id.provider === 'github');

      const hasDiscord = !!discordIdObj ||
        user?.app_metadata?.provider === 'discord' ||
        user?.app_metadata?.providers?.includes('discord');
      const hasGithub = !!githubIdObj ||
        user?.app_metadata?.provider === 'github' ||
        user?.app_metadata?.providers?.includes('github');

      if (hasDiscord) {
        providers.push({
          provider: 'discord',
          id: discordIdObj?.identity_data?.sub || discordIdObj?.id || user?.user_metadata?.provider_id || null,
          username: discordIdObj?.identity_data?.user_name || discordIdObj?.identity_data?.name || null
        });
      }
      if (hasGithub) {
        providers.push({
          provider: 'github',
          id: githubIdObj?.identity_data?.sub || githubIdObj?.id || null,
          username: githubIdObj?.identity_data?.user_name || githubIdObj?.identity_data?.name || null
        });
      }
      return providers;
    }
    return selectedProviders || [];
  }, [isViewingOthers, user, selectedProviders]);

  const displayName = useMemo(() => {
    return activeProfile?.display_name ||
      (isViewingOthers
        ? t('profile.defaultUser')
        : user?.user_metadata?.full_name || user?.user_metadata?.name || t('profile.defaultUser'));
  }, [activeProfile, isViewingOthers, user, t]);

  const avatarUrl = useMemo(() => {
    let raw = activeProfile?.avatar_url;
    if (!isViewingOthers) {
      if (!profile) return defaultAvatar;
      if (profile.avatar_url && !profile.avatar_url.includes('embed/avatars/')) {
        raw = profile.avatar_url;
      }
      else if (user?.user_metadata?.avatar_url) {
        raw = user.user_metadata.avatar_url;
      }
    }
    if (!raw || raw.includes('embed/avatars/')) return defaultAvatar;
    return raw;
  }, [activeProfile, isViewingOthers, profile, user]);

  const bannerUrl = activeProfile?.banner_url || null;

  // Preload banner image asynchronouly to prevent cascading renders
  useEffect(() => {
    if (!bannerUrl) {
      const timeoutId = setTimeout(() => setIsBannerImageLoading(false), 0);
      return () => clearTimeout(timeoutId);
    }

    const startTimeout = setTimeout(() => setIsBannerImageLoading(true), 0);
    const img = new Image();
    img.src = bannerUrl;

    let active = true;
    img.onload = () => {
      if (active) setIsBannerImageLoading(false);
    };
    img.onerror = () => {
      if (active) setIsBannerImageLoading(false);
    };

    return () => {
      active = false;
      clearTimeout(startTimeout);
    };
  }, [bannerUrl]);

  const handleRefresh = async () => {
    if (isOffline) return;
    setIsLoadingOtherProfile(true);
    try {
      if (selectedProfile) {
        await loadOtherProfileData(selectedProfile.id);
      } else {
        const refreshPromise = refreshProfile?.();
        const achievementsPromise = user?.id ? fetchOwnAchievements?.(user.id) : Promise.resolve();
        await Promise.all([refreshPromise, achievementsPromise]);
      }
    } catch (err) {
    } finally {
      setIsLoadingOtherProfile(false);
    }
  };

  const handleSelectProfile = (found) => {
    if (found.id === user?.id) {
      setSelectedProfile(null);
    } else if (found.id !== selectedProfile?.id) {
      setIsLoadingOtherProfile(true);
      setSelectedProfile(found);
    }
  };

  return {
    selectedProfile,
    setSelectedProfile,
    selectedAchievements,
    isLoadingOtherProfile,
    isBannerImageLoading,
    isViewingOthers,
    activeProfile,
    isOnline,
    connectedProviders,
    displayName,
    avatarUrl,
    bannerUrl,
    handleRefresh,
    handleSelectProfile
  };
}
