import React from 'react';
import { Award } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

import badgeDeveloper from '../../../assets/badge_developer.png';
import badgeAmbassador from '../../../assets/badge_ambassador.png';
import badgeMember from '../../../assets/badge_member.png';

const badgeIcons = {
  developer: badgeDeveloper,
  ambassador: badgeAmbassador,
  member: badgeMember,
  nomad: badgeMember
};

const DiscordIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 127.14 96.36"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5A52.2,52.2,0,0,0,31,78.27a76.36,76.36,0,0,0,65.06,0,52.2,52.2,0,0,0,2.94,2.27,68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

const GithubIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const AccountProfileCard = ({ avatarUrl, displayName, profile, role, isDiscordConnected, isGithubConnected }) => {
  const { t } = useLanguage();
  const { isOffline } = useAuth();

  return (
    <div className="account-profile-card">
      <img src={avatarUrl} alt="Avatar" className="account-avatar" />
      <div className="account-details">
        <span className="account-name">{displayName}</span>
        <span className="account-username">
          {isOffline
            ? `@${t('settings.nomadUser').toLowerCase()}`
            : (profile?.username ? `@${profile.username}` : `@${t('topbar.defaultUser').toLowerCase()}`)}
        </span>
        <div className="account-badge-row">
          <span className={`account-badge role ${role}`}>
            {badgeIcons[role] ? (
              <img src={badgeIcons[role]} alt="" className="account-badge-icon" />
            ) : (
              <Award size={14} />
            )}
            {t(`profile.role_${role}`)}
          </span>

          {isDiscordConnected && (
            <span className="account-badge discord">
              <DiscordIcon size={14} />
              {t('profile.linkedWithDiscord')}
            </span>
          )}

          {isGithubConnected && (
            <span className="account-badge github">
              <GithubIcon size={14} />
              {t('profile.linkedWithGithub')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountProfileCard;
