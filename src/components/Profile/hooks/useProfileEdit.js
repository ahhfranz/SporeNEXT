import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { compressImage, uploadProfileImage } from '../utils/profileUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorHelper';

const COOLDOWN_MS = {
  developer: 0,
  member: 7 * 24 * 60 * 60 * 1000,
  member: 7 * 24 * 60 * 60 * 1000,
};


export function useProfileEdit({ activeProfile, displayName, role, bannerUrl }) {
  const { t } = useLanguage();
  const { updateProfile } = useAuth();

  const [isGloballyEditing, setIsGloballyEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [newDisplayName, setNewDisplayName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [bannerPositionY, setBannerPositionY] = useState(50);
  const [tempAvatarUrl, setTempAvatarUrl] = useState(null);
  const [tempBannerUrl, setTempBannerUrl] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // keep form fields in syncc with the active profile when not editing
  useEffect(() => {
    if (!isGloballyEditing) {
      Promise.resolve().then(() => {
        setNewDisplayName(displayName);
        setNewBio(activeProfile?.description || '');
        setBannerPositionY(activeProfile?.banner_position_y ?? 50);
        setCountryCode(activeProfile?.country || '');
        setNewUsername(activeProfile?.username || '');
      });
    }
  }, [activeProfile, displayName, isGloballyEditing, t]);

  // user name cooldown countdown timer (while editing)
  const getUsernameCooldownSeconds = useCallback(() => {
    if (role === 'developer' || !activeProfile?.username_changed_at) return 0;
    const elapsed = Date.now() - new Date(activeProfile.username_changed_at).getTime();
    const limit = COOLDOWN_MS[role] ?? COOLDOWN_MS.member;
    if (elapsed >= limit) return 0;
    return Math.ceil((limit - elapsed) / 1000);
  }, [role, activeProfile]);

  useEffect(() => {
    if (!isGloballyEditing) return;
    const tick = () => setCooldownSeconds(getUsernameCooldownSeconds());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isGloballyEditing, getUsernameCooldownSeconds]);

  // cooldown label formatter
  const formatCooldown = (seconds) => {
    if (seconds >= 86400) {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      return `${d}${t('profile.cooldownDays')} ${h}${t('profile.cooldownHours')}`;
    }
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}${t('profile.cooldownHours')} ${m}${t('profile.cooldownMinutes')}`;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}${t('profile.cooldownMinutes')} ${s}${t('profile.cooldownSeconds')}`;
  };

  const handleStartEdit = () => {
    setIsGloballyEditing(true);
    setNewDisplayName(displayName);
    setNewBio(activeProfile?.description || '');
    setBannerPositionY(activeProfile?.banner_position_y ?? 50);
    setCountryCode(activeProfile?.country || '');
    setNewUsername(activeProfile?.username || '');
    setTempAvatarUrl(null);
    setTempBannerUrl(null);
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setIsGloballyEditing(false);
    setTempAvatarUrl(null);
    setTempBannerUrl(null);
    setBannerPositionY(activeProfile?.banner_position_y ?? 50);
    setNewDisplayName(displayName);
    setNewBio(activeProfile?.description || '');
    setCountryCode(activeProfile?.country || '');
    setNewUsername(activeProfile?.username || '');
    setErrorMsg('');
  };

  const handleSaveAll = async () => {
    const trimmedName = newDisplayName.trim();
    if (!trimmedName || trimmedName.length > 20) return;

    setErrorMsg('');
    setIsSaving(true);
    try {
      const updates = {};
      const userId = activeProfile?.id;

      if (trimmedName !== displayName) updates.display_name = trimmedName;

      const trimmedBio = newBio.trim();
      if (trimmedBio !== (activeProfile?.description || '')) {
        updates.description = trimmedBio;
      }

      if (tempAvatarUrl && userId) {
        updates.avatar_url = await uploadProfileImage(userId, 'avatar', tempAvatarUrl);
      } else if (tempAvatarUrl) {
        updates.avatar_url = tempAvatarUrl;
      }

      if (tempBannerUrl === '') {
        if (bannerUrl !== null) { updates.banner_url = null; updates.banner_position_y = 50; }
      } else {
        if (tempBannerUrl && userId) {
          updates.banner_url = await uploadProfileImage(userId, 'banner', tempBannerUrl);
        } else if (tempBannerUrl) {
          updates.banner_url = tempBannerUrl;
        }
        if (bannerPositionY !== (activeProfile?.banner_position_y ?? 50)) {
          updates.banner_position_y = bannerPositionY;
        }
      }

      if (countryCode !== (activeProfile?.country || '')) updates.country = countryCode;

      const cleanUsername = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername !== (activeProfile?.username || '')) {
        if (!cleanUsername) { setErrorMsg(t('profile.usernameEmpty')); setIsSaving(false); return; }
        if (cleanUsername.length < 3) { setErrorMsg(t('profile.usernameMinLength')); setIsSaving(false); return; }
        if (getUsernameCooldownSeconds() > 0) { setErrorMsg(t('profile.usernameCooldownError')); setIsSaving(false); return; }
        updates.username = cleanUsername;
        updates.username_changed_at = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
        if (userId) {
          if (updates.avatar_url) {
            localStorage.setItem(`sporenext_modified_avatar_${userId}`, 'true');
          }
          if (updates.banner_url !== undefined) {
            localStorage.setItem(`sporenext_modified_banner_${userId}`, 'true');
          }
        }
      }
      setIsGloballyEditing(false);
      setTempAvatarUrl(null);
      setTempBannerUrl(null);
    } catch (err) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate') || err.code === '23505') {
        setErrorMsg(t('profile.usernameTaken'));
      } else {
        setErrorMsg(getFriendlyErrorMessage(err, t, 'profile.saveError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setTempAvatarUrl(await compressImage(file, 256, 256, 0.8)); }
    catch (err) { }
  };

  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setTempBannerUrl(await compressImage(file, 1200, 400, 0.75));
      setBannerPositionY(50);
    } catch (err) { }
  };

  return {
    isGloballyEditing,
    isSaving,
    errorMsg,
    newDisplayName, setNewDisplayName,
    newBio, setNewBio,
    newUsername, setNewUsername,
    countryCode, setCountryCode,
    bannerPositionY, setBannerPositionY,
    tempAvatarUrl,
    tempBannerUrl, setTempBannerUrl,
    cooldownSeconds,
    formatCooldown,
    handleStartEdit,
    handleCancelEdit,
    handleSaveAll,
    handleAvatarFileChange,
    handleBannerFileChange,
  };
}
