import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { supabase } from '../../../lib/supabase';
import defaultAvatar from '../../../assets/default_avatar.png';
import { getFriendlyErrorMessage } from '../../../utils/errorHelper';
import { validatePassword } from '../../../utils/validationHelper';
import { linkOAuthProvider, unlinkOAuthProvider } from '../../../utils/oauthHelper';

export function useAccountSettings() {
  const { t } = useLanguage();
  const { user, profile, logout, refreshUser, refreshProfile, isOffline } = useAuth();

  // form fields
  const [email, setEmail] = useState(
    (user?.app_metadata?.providers?.includes('email') || user?.identities?.some(id => id.provider === 'email'))
      ? (user?.email || '')
      : ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDiscord, setIsSavingDiscord] = useState(false);
  const [isSavingGithub, setIsSavingGithub] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [showUnlinkGithubModal, setShowUnlinkGithubModal] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // tracks if an OAuth only user has manually set a password (stored in localStorage)
  const [hasSetPasswordFallback, setHasSetPasswordFallback] = useState(
    user?.id ? localStorage.getItem(`has_set_password_${user.id}`) === 'true' : false
  );

  const hasEmailPassword =
    user?.app_metadata?.providers?.includes('email') ||
    user?.identities?.some(id => id.provider === 'email') ||
    hasSetPasswordFallback;

  const discordIdentity = user?.identities?.find(id => id.provider === 'discord');

  const isDiscordConnected =
    !!discordIdentity ||
    user?.app_metadata?.provider === 'discord' ||
    user?.app_metadata?.providers?.includes('discord');

  const githubIdentity = user?.identities?.find(id => id.provider === 'github');

  const isGithubConnected =
    !!githubIdentity ||
    user?.app_metadata?.provider === 'github' ||
    user?.app_metadata?.providers?.includes('github');

  const canUnlinkDiscord = hasEmailPassword || isGithubConnected;
  const canUnlinkGithub = hasEmailPassword || isDiscordConnected;

  const role = isOffline ? 'nomad' : (profile?.role || 'member');
  const displayName = isOffline ? t('settings.nomadUser') : (profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || t('profile.defaultUser'));

  const getAvatarUrl = () => {
    if (isOffline) return defaultAvatar;
    if (!profile) return defaultAvatar; // profile still loading, prevent flicker
    let raw = null;
    if (profile.avatar_url && !profile.avatar_url.includes('embed/avatars/')) {
      raw = profile.avatar_url;
    }
    else if (user?.user_metadata?.avatar_url) {
      raw = user.user_metadata.avatar_url;
    }
    if (!raw || raw.includes('embed/avatars/')) return defaultAvatar;
    return raw;
  };

  const maskEmail = (emailStr) => {
    if (!emailStr) return '';
    const [username, domain] = emailStr.split('@');
    if (!domain) return emailStr;
    return '*'.repeat(username.length) + '@' + domain;
  };

  // handlers
  // OAuth users: set a password and link email for the first time
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !newPassword || !confirmPassword) { setErrorMsg(t('login.fillAllFields')); return; }
    if (newPassword !== confirmPassword) { setErrorMsg(t('login.passwordMismatch')); return; }
    const validErr = validatePassword(newPassword, t);
    if (validErr) { setErrorMsg(validErr); return; }

    setIsSaving(true);
    try {
      const updates = { password: newPassword };
      const trimmedEmail = email.trim();
      const isEmailChanged = trimmedEmail !== user?.email;
      if (isEmailChanged) {
        updates.email = trimmedEmail;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      if (!isEmailChanged) {
        setSuccessMsg(t('settings.setPasswordSuccess'));
      }
      setNewPassword('');
      setConfirmPassword('');
      setIsSettingPassword(false);
      setIsEditingEmail(false);
      if (user?.id) {
        localStorage.setItem(`has_set_password_${user.id}`, 'true');
        setHasSetPasswordFallback(true);
      }
    } catch (err) {
      console.error('Error linking email and password:', err);
      setErrorMsg(getFriendlyErrorMessage(err, t, 'settings.credentialsChangedError'));
    } finally {
      setIsSaving(false);
    }
  };

  /** email/password users: update email or password */
  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    const isEmailChanged = trimmedEmail !== user?.email;
    const hasNewPassword = newPassword.length > 0;

    if (!isEmailChanged && !hasNewPassword) { setErrorMsg(t('settings.noChangesDetected')); return; }
    if (!currentPassword) { setErrorMsg(t('settings.currentPasswordPlaceholder')); return; }

    if (hasNewPassword) {
      if (newPassword !== confirmPassword) { setErrorMsg(t('login.passwordMismatch')); return; }
      const validErr = validatePassword(newPassword, t);
      if (validErr) { setErrorMsg(validErr); return; }
    }

    setIsSaving(true);
    try {
      // verify current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (authError) { setErrorMsg(t('settings.incorrectCurrentPassword')); setIsSaving(false); return; }

      // apply updates
      const updates = {};
      if (isEmailChanged) updates.email = trimmedEmail;
      if (hasNewPassword) updates.password = newPassword;

      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) throw updateError;

      if (isEmailChanged) {
        setSuccessMsg(t('settings.emailChangedSuccess'));
      } else if (hasNewPassword) {
        setSuccessMsg(t('settings.passwordChangedSuccess'));
      }
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsEditingEmail(false);
      setIsEditingPassword(false);
    } catch (err) {
      console.error('Error updating credentials:', err);
      setErrorMsg(getFriendlyErrorMessage(err, t, 'settings.credentialsChangedError'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async (confirmPassword) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSaving(true);
    try {
      if (hasEmailPassword) {
        if (!confirmPassword) {
          throw new Error(t('login.fillAllFields') || 'Please enter your password.');
        }
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: confirmPassword,
        });
        if (authError) {
          throw new Error(t('settings.incorrectCurrentPassword') || 'Incorrect password.');
        }
      }

      // delete endorsements
      const { error: likesError } = await supabase
        .from('mod_likes')
        .delete()
        .eq('user_id', user.id);
      if (likesError) console.warn('Could not delete likes:', likesError.message);

      // delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (profileError) console.warn('Could not delete profile:', profileError.message);

      // call RPC to delete auth.user
      const { error: rpcError } = await supabase.rpc('delete_user');
      if (rpcError) {
        console.error('Delete user RPC failed:', rpcError);
        throw new Error(
          t('settings.deleteUserRPCError') ||
          'Error deleting account. Please configure the "delete_user" RPC function in Supabase.'
        );
      }

      // log out locally
      await logout();
    } catch (err) {
      console.error('Failed to delete account:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** link Discord OAuth identity */
  const handleLinkDiscord = async () => {
    await linkOAuthProvider({
      provider: 'discord',
      refreshUser,
      refreshProfile,
      t,
      onStart: () => {
        setErrorMsg('');
        setSuccessMsg('');
        setIsSaving(true);
        setIsSavingDiscord(true);
      },
      onSuccess: () => {
        setIsSaving(false);
        setIsSavingDiscord(false);
      },
      onFailure: (errMessage) => {
        setErrorMsg(errMessage);
        setIsSaving(false);
        setIsSavingDiscord(false);
      },
      onFinalize: () => {
        setIsSaving(false);
        setIsSavingDiscord(false);
      }
    });
  };

  /** unlink Discord OAuth identity */
  const handleUnlinkDiscord = async () => {
    await unlinkOAuthProvider({
      provider: 'discord',
      user,
      refreshUser,
      t,
      onStart: () => {
        setErrorMsg('');
        setSuccessMsg('');
        setIsSaving(true);
        setIsSavingDiscord(true);
      },
      onSuccess: () => {
        setIsSaving(false);
        setIsSavingDiscord(false);
      },
      onFailure: (errMessage) => {
        setErrorMsg(errMessage);
        setIsSaving(false);
        setIsSavingDiscord(false);
      }
    });
  };

  /** link GitHub OAuth identity */
  const handleLinkGithub = async () => {
    await linkOAuthProvider({
      provider: 'github',
      scopes: 'user:email',
      refreshUser,
      refreshProfile,
      t,
      onStart: () => {
        setErrorMsg('');
        setSuccessMsg('');
        setIsSaving(true);
        setIsSavingGithub(true);
      },
      onSuccess: () => {
        setIsSaving(false);
        setIsSavingGithub(false);
      },
      onFailure: (errMessage) => {
        setErrorMsg(errMessage);
        setIsSaving(false);
        setIsSavingGithub(false);
      },
      onFinalize: () => {
        setIsSaving(false);
        setIsSavingGithub(false);
      }
    });
  };

  /** unlink GitHub OAuth identity */
  const handleUnlinkGithub = async () => {
    await unlinkOAuthProvider({
      provider: 'github',
      user,
      refreshUser,
      t,
      onStart: () => {
        setErrorMsg('');
        setSuccessMsg('');
        setIsSaving(true);
        setIsSavingGithub(true);
      },
      onSuccess: () => {
        setIsSaving(false);
        setIsSavingGithub(false);
      },
      onFailure: (errMessage) => {
        setErrorMsg(errMessage);
        setIsSaving(false);
        setIsSavingGithub(false);
      }
    });
  };

  return {
    // derived
    avatarUrl: getAvatarUrl(),
    displayName,
    role,
    isDiscordConnected,
    discordIdentity,
    canUnlinkDiscord,
    isGithubConnected,
    githubIdentity,
    canUnlinkGithub,
    hasEmailPassword,
    // Form state
    email, setEmail,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    currentPassword, setCurrentPassword,
    // UI state
    isSaving,
    isSavingDiscord,
    isSavingGithub,
    errorMsg, setErrorMsg,
    successMsg, setSuccessMsg,
    showEmail, setShowEmail,
    showDeleteModal, setShowDeleteModal,
    showUnlinkModal, setShowUnlinkModal,
    showUnlinkGithubModal, setShowUnlinkGithubModal,
    isEditingEmail, setIsEditingEmail,
    isEditingPassword, setIsEditingPassword,
    isSettingPassword, setIsSettingPassword,
    // helpers
    maskEmail,
    // handlers
    handleCreatePassword,
    handleSaveCredentials,
    deleteAccount,
    handleLinkDiscord,
    handleUnlinkDiscord,
    handleLinkGithub,
    handleUnlinkGithub,
    user,
    profile,
  };
}
