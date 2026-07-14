import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext) || {};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loadedUserId, setLoadedUserId] = useState('nomad');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const userId = user?.id || 'nomad';
    const saved = localStorage.getItem(`sporenext_notifications_${userId}`);
    let parsed = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse notifications from localStorage:', e);
      }
    }
    Promise.resolve().then(() => {
      setNotifications(parsed);
      setLoadedUserId(userId);
    });
  }, [user?.id]);

  const addNotification = useCallback(({ type, titleKey, details, achievementId }) => {
    const newNotif = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      titleKey,
      details: details || '',
      achievementId: achievementId || null,
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      const userId = user?.id || 'nomad';
      localStorage.setItem(`sporenext_notifications_${userId}`, JSON.stringify(updated));
      return updated;
    });
  }, [user?.id]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      const userId = user?.id || 'nomad';
      localStorage.setItem(`sporenext_notifications_${userId}`, JSON.stringify(updated));
      return updated;
    });
  }, [user?.id]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    const userId = user?.id || 'nomad';
    localStorage.removeItem(`sporenext_notifications_${userId}`);
  }, [user?.id]);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      const userId = user?.id || 'nomad';
      if (updated.length === 0) {
        localStorage.removeItem(`sporenext_notifications_${userId}`);
      } else {
        localStorage.setItem(`sporenext_notifications_${userId}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // detect new Discord and GitHub connections
  const prevDiscordRef = useRef(null);
  const prevGithubRef = useRef(null);

  useEffect(() => {
    if (!user) {
      prevDiscordRef.current = null;
      prevGithubRef.current = null;
      return;
    }

    const isDiscordConnected = user.identities?.some(id => id.provider === 'discord') || false;
    const isGithubConnected = user.identities?.some(id => id.provider === 'github') || false;

    if (prevDiscordRef.current !== null && prevDiscordRef.current === false && isDiscordConnected === true) {
      addNotification({
        type: 'discord_linked',
        titleKey: 'notifications.discord_linked',
        details: user.user_metadata?.discord_username || ''
      });
    }

    if (prevGithubRef.current !== null && prevGithubRef.current === false && isGithubConnected === true) {
      addNotification({
        type: 'github_linked',
        titleKey: 'notifications.github_linked',
        details: user.user_metadata?.user_name || ''
      });
    }

    prevDiscordRef.current = isDiscordConnected;
    prevGithubRef.current = isGithubConnected;
  }, [user, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        addNotification,
        markAllAsRead,
        clearAll,
        deleteNotification,
        loadedUserId
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
