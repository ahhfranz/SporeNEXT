import React from 'react';
import { Check, Search, Award } from 'lucide-react';
import './Topbar.css';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import defaultAvatar from '../../assets/default_avatar.png';
import badgeDeveloper from '../../assets/badge_developer.png';
import badgeAmbassador from '../../assets/badge_ambassador.png';
import badgeMember from '../../assets/badge_member.png';

const badgeIcons = {
  developer: badgeDeveloper,
  ambassador: badgeAmbassador,
  member: badgeMember,
  nomad: badgeMember
};

const archetypeColors = {
  Seeker: '#97989b',
  Wanderer: '#57606f',
  Bard: '#47ba8a',
  Diplomat: '#cace47',
  Ecologist: '#a6d145',
  Knight: '#d3459a',
  Scientist: '#4e45c9',
  Shaman: '#4ff761',
  Trader: '#4bbfdc',
  Warrior: '#da3f13',
  Zealot: '#ad48d6'
};

const getArchetypeColor = (val) => {
  if (!val) return 'rgba(255, 255, 255, 0.1)';
  const clean = val.trim();
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  return archetypeColors[formatted] || 'rgba(255, 255, 255, 0.1)';
};

const Topbar = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const { user, profile, isOffline, isNetworkOnline } = useAuth();

  const role = isOffline ? 'nomad' : (profile?.role || 'member');
  const archetypeColor = isOffline ? 'rgba(255, 255, 255, 0.1)' : getArchetypeColor(profile?.archetype);

  const getAvatarUrl = () => {
    if (isOffline) return defaultAvatar;
    if (!profile) return defaultAvatar; // profile still loading = prevent flicker
    let rawAvatar = null;

    // stored profile avatar (highest priority > custom uploaded or initial provider avatar)
    if (profile.avatar_url && !profile.avatar_url.includes('embed/avatars/')) {
      rawAvatar = profile.avatar_url;
    }
    // current OAuth provider session avatar
    else if (user?.user_metadata?.avatar_url) {
      rawAvatar = user.user_metadata.avatar_url;
    }

    if (!rawAvatar || rawAvatar.includes('embed/avatars/')) {
      return defaultAvatar;
    }
    return rawAvatar;
  };

  const avatarUrl = getAvatarUrl();



  return (
    <div className="topbar">
      {/* dragg area */}
      <div className="topbar-drag-area" />


      <div className="topbar-right">
        {!isNetworkOnline && (
          <div className="topbar-offline-badge">
            <span className="offline-dot" />
            <span>{t('errors.offlineMode')}</span>
          </div>
        )}
        {/* user profile */}
        {activeTab !== 'profile' && (
          <div
            className={`user-profile ${isOffline ? 'disabled' : ''}`}
            onClick={() => { if (!isOffline) setActiveTab('profile'); }}
            style={{ cursor: isOffline ? 'not-allowed' : 'pointer' }}
          >
            <div className="user-text">
              <span className="user-name">
                {isOffline
                  ? t('settings.nomadUser')
                  : (profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || t('topbar.defaultUser'))}
              </span>
              <span className={`user-role ${role}`} data-tooltip={t(`profile.role_${role}`)}>
                {badgeIcons[role] ? (
                  <img src={badgeIcons[role]} alt="" className="user-role-badge-icon" />
                ) : (
                  <Award size={11} />
                )}
                {t(`profile.role_${role}`)}
              </span>
            </div>
            <div className="user-avatar-wrapper">
              <div className="user-avatar" style={{ borderColor: archetypeColor }}>
                <img key={user?.id || 'offline'} src={avatarUrl} alt="avatar" />
              </div>
              {!isOffline && (
                <div className={`profile-status-indicator ${isNetworkOnline ? 'online' : 'offline'}`}></div>
              )}
            </div>
          </div>
        )}

      </div>



    </div>
  );
};

export default Topbar;
