import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  CheckCircle2,
  MinusCircle,
  Globe,
  Link2,
  Trash2,
  X
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAchievements } from '../../context/AchievementContext';
import enJson from '../../locales/en.json';
import esJson from '../../locales/es.json';
import loadingIcon from '../../assets/loading.png';
import './NotificationPanel.css';

// immport for achievement images
import img1 from '../../assets/achievements/sporenext_achievement_id1.webp';
import img2 from '../../assets/achievements/sporenext_achievement_id2.webp';
import img3 from '../../assets/achievements/sporenext_achievement_id3.webp';
import img4 from '../../assets/achievements/sporenext_achievement_id4.webp';
import img5 from '../../assets/achievements/sporenext_achievement_id5.webp';
import img6 from '../../assets/achievements/sporenext_achievement_id6.webp';
import img7 from '../../assets/achievements/sporenext_achievement_id7.webp';
import img8 from '../../assets/achievements/sporenext_achievement_id8.webp';
import img9 from '../../assets/achievements/sporenext_achievement_id9.webp';
import img10 from '../../assets/achievements/sporenext_achievement_id10.webp';
import img11 from '../../assets/achievements/sporenext_achievement_id11.webp';
import img12 from '../../assets/achievements/sporenext_achievement_id12.webp';
import img13 from '../../assets/achievements/sporenext_achievement_id13.webp';
import img14 from '../../assets/achievements/sporenext_achievement_id14.webp';
import img15 from '../../assets/achievements/sporenext_achievement_id15.webp';
import img16 from '../../assets/achievements/sporenext_achievement_id16.webp';
import img17 from '../../assets/achievements/sporenext_achievement_id17.webp';
import img18 from '../../assets/achievements/sporenext_achievement_id18.webp';
import img19 from '../../assets/achievements/sporenext_achievement_id19.webp';

const achievementIcons = {
  id1: img1,
  id2: img2,
  id3: img3,
  id4: img4,
  id5: img5,
  id6: img6,
  id7: img7,
  id8: img8,
  id9: img9,
  id10: img10,
  id11: img11,
  id12: img12,
  id13: img13,
  id14: img14,
  id15: img15,
  id16: img16,
  id17: img17,
  id18: img18,
  id19: img19,
};

const NotificationPanel = () => {
  const { t, language } = useLanguage();
  const { achievementsMeta } = useAchievements();
  const {
    notifications,
    isOpen,
    setIsOpen,
    markAllAsRead,
    clearAll,
    deleteNotification
  } = useNotification();

  const panelRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  // set the current time on mount and update periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // automatically mark all as read when opening the panel
  useEffect(() => {
    if (isOpen && notifications.some(n => !n.read)) {
      markAllAsRead();
    }
  }, [isOpen, notifications, markAllAsRead]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        const sidebarElement = document.querySelector('.sidebar');
        if (sidebarElement && sidebarElement.contains(e.target)) {
          const helpBtn = sidebarElement.querySelector('.help');
          const logoutBtn = sidebarElement.querySelector('.logout');

          const clickedHelp = helpBtn && helpBtn.contains(e.target);
          const clickedLogout = logoutBtn && logoutBtn.contains(e.target);

          if (clickedHelp || clickedLogout) {
            setIsOpen(false);
          }
          return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const getIcon = (type, achievementId) => {
    switch (type) {
      case 'achievement_unlocked':
        if (achievementId && achievementIcons[achievementId]) {
          return (
            <img
              src={achievementIcons[achievementId]}
              alt="Achievement"
              className="notif-achievement-img"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />
          );
        }
        return <CheckCircle2 size={18} className="notif-icon-default" />;
      case 'download_success':
        return <Download size={18} className="notif-icon-download" />;
      case 'install_success':
        return <CheckCircle2 size={18} className="notif-icon-install" />;
      case 'uninstall_success':
        return <MinusCircle size={18} className="notif-icon-uninstall" />;
      case 'cache_cleared':
        return <Trash2 size={18} className="notif-icon-clear" />;
      case 'galaxy_reset':
        return <Globe size={18} className="notif-icon-galaxy" />;
      case 'discord_linked':
      case 'github_linked':
        return <Link2 size={18} className="notif-icon-link" />;
      default:
        return <CheckCircle2 size={18} className="notif-icon-default" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('notifications.timeJustNow') || 'Just now';
    if (diffMins < 60) return (t('notifications.timeMinutesAgo') || '{m}m ago').replace('{m}', diffMins);
    if (diffHours < 24) return (t('notifications.timeHoursAgo') || '{h}h ago').replace('{h}', diffHours);
    return (t('notifications.timeDaysAgo') || '{d}d ago').replace('{d}', diffDays);
  };

  return (
    <div className={`notification-drawer ${isOpen ? 'open' : ''}`} ref={panelRef}>
      {/*header */}
      <div className="notif-header">
        <h3 className="notif-title">{t('notifications.title') || 'Notifications'}</h3>
      </div>

      {/* action buttons */}
      {notifications.length > 0 && (
        <div className="notif-actions">
          <button className="notif-action-btn delete" onClick={clearAll}>
            <Trash2 size={14} />
            <span>{t('notifications.clearAll') || 'Clear all'}</span>
          </button>
        </div>
      )}

      {/* notifications list */}
      <div className="notif-content">
        {notifications.length === 0 ? (
          <div className="notif-empty-state">
            <img src={loadingIcon} alt="Empty" className="notif-empty-icon" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            <p className="notif-empty-text">{t('notifications.empty') || 'No notifications yet'}</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((n) => {
              let resolvedAchievementId = n.achievementId;
              let detailText = n.details;

              if (n.type === 'achievement_unlocked') {
                const targetId = resolvedAchievementId || (n.details && n.details.startsWith('profile.achievements.') ? n.details.replace('profile.achievements.', '') : null);
                const meta = achievementsMeta?.find(a => a.id === targetId || a.id === n.achievementId);
                if (meta) {
                  detailText = language === 'en' ? meta.name_en : meta.name_es;
                  if (!resolvedAchievementId) resolvedAchievementId = meta.id;
                } else if (detailText && detailText.startsWith('profile.achievements.')) {
                  const rawKey = detailText;
                  detailText = t(rawKey) !== rawKey ? t(rawKey) : (targetId || n.achievementId || '');
                }
              }

              return (
                <div key={n.id} className={`notif-card ${!n.read ? 'unread' : ''}`}>
                  <div className="notif-icon-wrap">
                    {getIcon(n.type, resolvedAchievementId)}
                  </div>
                  <div className="notif-body">
                    <h4 className="notif-card-title">
                      {t(n.titleKey) || n.titleKey}
                    </h4>
                    {detailText ? (
                      <p className="notif-card-desc" data-tooltip={detailText}>
                        {detailText}
                      </p>
                    ) : null}
                    <span className="notif-card-time">{formatTimeAgo(n.timestamp)}</span>
                  </div>
                  <div className="notif-actions-wrap">
                    {!n.read && <div className="unread-dot" />}
                    <button
                      className="notif-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      data-tooltip={t('notifications.delete') || 'Delete'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
