import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from './LanguageContext';
import { getRedirectUrl } from '../utils/urlHelper';
import { fetchProfile, getOrCreateProfile, preloadImage } from '../utils/authUtils';
import { useNetworkMonitor } from '../hooks/useNetworkMonitor';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const userRef = React.useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [profile, setProfile] = useState(null);
  const profileRef = React.useRef(null);

  const updateLocalProfile = (val) => {
    profileRef.current = val;
    setProfile(val);
  };

  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [onlineUsers] = useState(new Set());

  // use modular network monitor hook
  const {
    onlineCount,
    isOffline,
    setIsOffline,
    isNetworkOnline
  } = useNetworkMonitor(userRef);

  useEffect(() => {
    let active = true;

    const updateLastActive = async (uId) => {
      try {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', uId);
      } catch (err) {
      }
    };

    const handleSession = async (session) => {
      if (!active) return;
      if (!session) {
        setUser(null);
        updateLocalProfile(null);
        setLoading(false);
        return;
      }

      try {
        if (active && !profileRef.current) {
          setLoading(true);
        }
        // fetch fresh user to avoid using cached JWT data
        const { data: { user: freshUser }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (active) {
          setUser(freshUser || session.user);
        }

        const userId = freshUser?.id || session.user.id;
        // update last active asynchronously in background
        updateLastActive(userId);

        const p = await getOrCreateProfile(userId, freshUser || session.user);

        if (active && p) {
          if (p.avatar_url && !p.avatar_url.includes('embed/avatars/')) {
            await preloadImage(p.avatar_url);
          }
          if (active) {
            updateLocalProfile(p);
          }
        }
      } catch (err) {
        // fallback to cached session user if getUser fails
        if (active) {
          setUser(session.user);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    // check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch(err => {
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session);

      if (event === 'PASSWORD_RECOVERY' && active) {
        setRecoveryMode(true);
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && window.opener) {
        window.close();
      }
    });

    // listen to Discord login success events from IPC
    let unsubscribeDiscord = null;
    if (window.electronAPI && typeof window.electronAPI.onDiscordLoginSuccess === 'function') {
      unsubscribeDiscord = window.electronAPI.onDiscordLoginSuccess(async ({ accessToken, refreshToken }) => {
        try {
          if (active) setLoading(true);
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) {
          }
        } catch (err) {
        } finally {
          if (active) setLoading(false);
        }
      });
    }

    return () => {
      active = false;
      subscription.unsubscribe();
      if (unsubscribeDiscord) {
        unsubscribeDiscord();
      }
    };
  }, []);

  const loginWithDiscord = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        skipBrowserRedirect: true,
        redirectTo: getRedirectUrl('discord')
      }
    });

    if (data?.url) {
      window.open(data.url);
    }

    if (error) console.error('Error logging in with Discord:', error.message);
  }, []);

  const loginWithGithub = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'user:email',
        skipBrowserRedirect: true,
        redirectTo: getRedirectUrl('github')
      }
    });

    if (data?.url) {
      window.open(data.url);
    }

    if (error) console.error('Error logging in with GitHub:', error.message);
  }, []);

  const loginWithEmail = useCallback(async (emailOrUsername, password) => {
    let email = emailOrUsername.trim();

    // check if the input is an email
    if (!email.includes('@')) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', email)
        .maybeSingle();

      if (error) {
        throw new Error(t('login.invalidLogin'));
      }

      if (!data || !data.email) {
        throw new Error(t('login.invalidLogin'));
      }

      email = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    if (data?.user?.id) {
      localStorage.setItem(`has_set_password_${data.user.id}`, 'true');
    }
    return data;
  }, [t]);

  const registerWithEmail = useCallback(async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: username }
      }
    });
    if (error) throw error;
    if (data?.user?.id) {
      localStorage.setItem(`has_set_password_${data.user.id}`, 'true');
    }
    return data;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  }, []);

  const verifySignupOtp = useCallback(async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    });
    if (error) throw error;
    return data;
  }, []);

  const verifyRecoveryOtp = useCallback(async (email, token, newPassword) => {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery'
    });

    if (verifyError) throw verifyError;

    const { data, error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) throw updateError;
    if (data?.user?.id) {
      localStorage.setItem(`has_set_password_${data.user.id}`, 'true');
    }

    setRecoveryMode(false);
    return data;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    if (data?.user?.id) {
      localStorage.setItem(`has_set_password_${data.user.id}`, 'true');
    }
    setRecoveryMode(false);
    return data;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('No user is logged in');

    const { archetype, archetype_breakdown, ...otherUpdates } = updates;
    let updatedData = null;

    if (Object.keys(otherUpdates).length > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .update(otherUpdates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      updatedData = data;
    }

    if (archetype !== undefined) {
      localStorage.setItem(`sporenext_archetype_${user.id}`, archetype);
      if (archetype_breakdown !== undefined) {
        localStorage.setItem(`sporenext_archetype_results_${user.id}`, JSON.stringify(archetype_breakdown));
      } else if (archetype === 'Seeker') {
        localStorage.removeItem(`sporenext_archetype_results_${user.id}`);
      }

      try {
        const { error: archError } = await supabase
          .from('profiles')
          .update({ archetype })
          .eq('id', user.id);

        if (!archError) {
          if (!updatedData) {
            updatedData = { ...profileRef.current };
          }
          updatedData.archetype = archetype;
        } else {
          if (!updatedData) {
            updatedData = { ...profileRef.current };
          }
          updatedData.archetype = archetype;
        }
      } catch (e) {
        if (!updatedData) {
          updatedData = { ...profileRef.current };
        }
        updatedData.archetype = archetype;
      }

      try {
        const updatePayload = {};
        if (archetype_breakdown !== undefined) {
          updatePayload.archetype_breakdown = archetype_breakdown;
        } else if (archetype === 'Seeker') {
          updatePayload.archetype_breakdown = null;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: breakdownError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id);

          if (!breakdownError) {
            if (!updatedData) {
              updatedData = { ...profileRef.current };
            }
            updatedData.archetype_breakdown = archetype_breakdown || null;
          } else {
            if (!updatedData) {
              updatedData = { ...profileRef.current };
            }
            updatedData.archetype_breakdown = archetype_breakdown || null;
          }
        }
      } catch (e) {
        if (!updatedData) {
          updatedData = { ...profileRef.current };
        }
        updatedData.archetype_breakdown = archetype_breakdown || null;
      }
    }

    if (updatedData) {
      updateLocalProfile(updatedData);
      return updatedData;
    }

    return profileRef.current;
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const p = await getOrCreateProfile(user.id, user);
    if (p) {
      if (p.avatar_url && !p.avatar_url.includes('embed/avatars/')) {
        await preloadImage(p.avatar_url);
      }
      updateLocalProfile(p);
      return p;
    }
    return null;
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: updatedUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (updatedUser) {
        setUser(updatedUser);
      }
      return updatedUser;
    } catch (err) {
      return null;
    }
  }, []);

  const loginOffline = useCallback(() => {
    localStorage.setItem('sporenext_offline_mode', 'true');
    setIsOffline(true);
    setUser(null);
    updateLocalProfile(null);
  }, [setIsOffline]);

  const logout = useCallback(async () => {
    localStorage.removeItem('sporenext_offline_mode');
    setIsOffline(false);
    await supabase.auth.signOut();
  }, [setIsOffline]);

  const effectiveLoading = loading || (!!user && !profile && !isOffline);

  return (
    <AuthContext.Provider value={{ user, profile, fetchProfile, updateProfile, refreshProfile, refreshUser, loginWithDiscord, loginWithGithub, loginWithEmail, registerWithEmail, verifySignupOtp, resetPassword, updatePassword, verifyRecoveryOtp, logout, loading: effectiveLoading, recoveryMode, onlineCount, onlineUsers, isOffline, loginOffline, isNetworkOnline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || {};
