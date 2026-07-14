export function evaluateProfileAchievements({
  user,
  profile,
  unlockedAchievements,
  unlockAchievement,
  initialProfile,
  initialIdentities,
  isOffline,
  loading,
  achievementsUserId
}) {
  if (loading || achievementsUserId !== user?.id || isOffline || !user?.id || user.id === 'nomad' || !initialProfile) return;
  const isUnlocked = (id) => unlockedAchievements[id] !== undefined;

  if (profile && profile.id === user.id) {
    // id3: Galactic citizen
    if (!isUnlocked('id3')) {
      unlockAchievement('id3');
    }

    // id4: Galactic ambassador
    if (profile.role === 'ambassador' && !isUnlocked('id4')) {
      unlockAchievement('id4');
    }

    // id6: Photographer
    const hasCustomAvatar = profile.avatar_url && !profile.avatar_url.includes('embed/avatars/') && !profile.avatar_url.includes('default_avatar');
    const hasCustomBanner = !!profile.banner_url;
    const avatarChanged = profile.avatar_url !== initialProfile.avatar_url;
    const bannerChanged = profile.banner_url !== initialProfile.banner_url;

    if (hasCustomAvatar && hasCustomBanner && (avatarChanged || bannerChanged) && !isUnlocked('id6')) {
      unlockAchievement('id6');
    }

    // id9: Evolutionary path
    if (profile.archetype && profile.archetype !== 'Seeker' && profile.archetype !== initialProfile.archetype && !isUnlocked('id9')) {
      unlockAchievement('id9');
    }

    // id15: Galactic veteran
    if (profile.created_at) {
      const createdTime = new Date(profile.created_at).getTime();
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (Date.now() - createdTime >= oneYearMs && !isUnlocked('id15')) {
        unlockAchievement('id15');
      }
    }

    // id16: Space autobiography
    if (profile.description && profile.description.trim() !== '' && profile.description !== initialProfile.description && !isUnlocked('id16')) {
      unlockAchievement('id16');
    }

    // id17: Interstellar cartographer
    if (profile.country && profile.country.trim() !== '' && profile.country !== initialProfile.country && !isUnlocked('id17')) {
      unlockAchievement('id17');
    }

    // id12: Signal Received
    const hasDiscord = user?.identities?.some(id => id.provider === 'discord') || false;
    const wasDiscordLinked = initialIdentities?.some(id => id.provider === 'discord') || false;
    if (hasDiscord && !wasDiscordLinked && !isUnlocked('id12')) {
      unlockAchievement('id12');
    }

    // id13: Galactic Archive
    const hasGithub = user?.identities?.some(id => id.provider === 'github') || false;
    const wasGithubLinked = initialIdentities?.some(id => id.provider === 'github') || false;
    if (hasGithub && !wasGithubLinked && !isUnlocked('id13')) {
      unlockAchievement('id13');
    }
  }
}

export function evaluateModAchievements({
  user,
  mods,
  unlockedAchievements,
  unlockAchievement,
  initialMods,
  isOffline,
  loading,
  achievementsUserId
}) {
  if (loading || achievementsUserId !== user?.id || isOffline || !user?.id || user.id === 'nomad' || !mods || mods.length === 0 || !initialMods) return;
  const isUnlocked = (id) => unlockedAchievements[id] !== undefined;

  // check if any mod status transitioned to 'installed' in active session
  const justInstalledAny = mods.some(m => {
    const initialMod = initialMods.find(bm => bm.id === m.id);
    const wasInstalled = initialMod ? initialMod.status === 'installed' : false;
    return m.status === 'installed' && !wasInstalled;
  });

  if (justInstalledAny) {
    // id1: Initial mutation
    if (!isUnlocked('id1')) {
      unlockAchievement('id1');
    }

    // id2: Galactic adaptation
    const installedMods = mods.filter(m => m.status === 'installed');
    const requiredCategories = ['optimization', 'fixes', 'gameplay', 'textures', 'ui', 'editors', 'dependencies'];
    const installedCategories = new Set(installedMods.map(m => m.category?.trim().toLowerCase()).filter(Boolean));
    const hasAllCategories = requiredCategories.every(cat => installedCategories.has(cat));

    if (hasAllCategories && !isUnlocked('id2')) {
      unlockAchievement('id2');
    }
  }

  const githubIdObj = user.identities?.find(id => id.provider === 'github');
  const githubUsername = (githubIdObj?.identity_data?.user_name || githubIdObj?.identity_data?.name || user.user_metadata?.user_name || '').toLowerCase();

  if (githubUsername) {
    // id10: Galactic architect
    const ownsAnyModByGithub = mods.some(m => m.github_owner && m.github_owner.toLowerCase() === githubUsername);
    if (ownsAnyModByGithub && !isUnlocked('id10')) {
      unlockAchievement('id10');
    }

    // id8: Galactic legend
    const ownsLegendaryModByGithub = mods.some(m =>
      m.github_owner &&
      m.github_owner.toLowerCase() === githubUsername &&
      (m.likes || 0) >= 100
    );
    if (ownsLegendaryModByGithub && !isUnlocked('id8')) {
      unlockAchievement('id8');
    }
  }
}

export function evaluateGalaxyResetAchievements({
  user,
  notifications,
  unlockedAchievements,
  unlockAchievement,
  initialNotifications,
  loadedUserId,
  isOffline,
  loading,
  achievementsUserId
}) {
  if (loading || achievementsUserId !== user?.id || isOffline || !user || user.id === 'nomad' || !notifications || !initialNotifications) return;
  if (loadedUserId !== user.id) return;
  const isUnlocked = (id) => unlockedAchievements[id] !== undefined;

  // id7: Fresh Start
  const hasNewReset = notifications.some(n =>
    n.type === 'galaxy_reset' && !initialNotifications.some(bn => bn.id === n.id)
  );

  if (hasNewReset && !isUnlocked('id7')) {
    unlockAchievement('id7');
  }
}
