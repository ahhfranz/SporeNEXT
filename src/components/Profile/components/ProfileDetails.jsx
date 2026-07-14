import React from 'react';
import { Award, Clock, Calendar } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import CountrySelect from '../../CountrySelect/CountrySelect';
import { formatDate, formatLastOnline } from '../utils/profileUtils';
import './ProfileDetails.css';

import badgeDeveloper from '../../../assets/badge_developer.png';
import badgeAmbassador from '../../../assets/badge_ambassador.png';
import badgeMember from '../../../assets/badge_member.png';

const badgeIcons = {
  developer: badgeDeveloper,
  ambassador: badgeAmbassador,
  member: badgeMember
};

const DiscordIcon = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 127.14 96.36"
    fill="currentColor"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5A52.2,52.2,0,0,0,31,78.27a76.36,76.36,0,0,0,65.06,0,52.2,52.2,0,0,0,2.94,2.27,68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

const GithubIcon = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);


const ProfileDetails = ({
  displayName,
  role,
  activeProfile,
  isViewingOthers,
  isGloballyEditing,
  newDisplayName, setNewDisplayName,
  newUsername, setNewUsername,
  countryCode, setCountryCode,
  cooldownSeconds,
  formatCooldown,
  errorMsg,
  user,
  connectedProviders = [],
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="profile-details">
      {/* display name + badge */}
      <div className="profile-name-group">
        {isGloballyEditing ? (
          <div className="edit-display-name-container">
            <input
              type="text"
              className="edit-display-name-input"
              value={newDisplayName}
              onChange={e => setNewDisplayName(e.target.value)}
              maxLength={15}
              autoFocus
            />
          </div>
        ) : (
          <>
            <h1 className="profile-username">{displayName}</h1>
            {connectedProviders && connectedProviders.length > 0 && (
              <div className="profile-connection-badges">
                {connectedProviders.map(cp => {
                  if (cp.provider === 'discord' && cp.id) {
                    return (
                      <a
                        key="discord"
                        href={`https://discordapp.com/users/${cp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="profile-conn-badge discord"
                        data-tooltip={t('settings.discordConnected') || "Discord conectado"}
                      >
                        <DiscordIcon size={20} />
                      </a>
                    );
                  }
                  if (cp.provider === 'github' && cp.username) {
                    return (
                      <a
                        key="github"
                        href={`https://github.com/${cp.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="profile-conn-badge github"
                        data-tooltip={t('settings.githubConnected') || "GitHub conectado"}
                      >
                        <GithubIcon size={20} />
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </>
        )}
        <span className={`profile-badge ${role}`} data-tooltip={t(`profile.role_${role}`)}>
          {badgeIcons[role] ? (
            <img src={badgeIcons[role]} alt="" className="profile-badge-icon" />
          ) : (
            <Award size={14} />
          )}
          {t(`profile.role_${role}`)}
        </span>
      </div>

      {/* @username handle */}
      <div className="profile-handle-row">
        {isGloballyEditing ? (
          <div className="edit-username-section">
            <div className={`edit-username-wrapper ${cooldownSeconds > 0 ? 'disabled' : ''}`}>
              <span className="username-prefix">@</span>
              <input
                type="text"
                className="edit-username-input"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={15}
                disabled={cooldownSeconds > 0}
                placeholder={t('profile.usernamePlaceholder')}
              />
            </div>
            {cooldownSeconds > 0 ? (
              <div className="username-cooldown-text">
                <Clock size={12} />
                <span>{t('profile.usernameCooldown').replace('{time}', formatCooldown(cooldownSeconds))}</span>
              </div>
            ) : (
              <div className="username-help-text">
                <span>{t('profile.usernameHelp')}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="profile-handle">
            {activeProfile?.username ? `@${activeProfile.username}` : '@username'}
          </span>
        )}
      </div>

      {/* country + dates metadata */}
      <div className="profile-metadata-container">
        <CountrySelect
          isGloballyEditing={isGloballyEditing}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          language={language}
          t={t}
        />

        <div className="profile-metadata-item">
          <Clock size={14} />
          <span>
            {t('profile.lastActive')} {formatLastOnline(activeProfile?.last_active_at, language)}
          </span>
        </div>

        <div className="profile-metadata-item">
          <Calendar size={14} />
          <span>
            {t('profile.joinedOn')} {formatDate(activeProfile?.created_at || (!isViewingOthers ? user?.created_at : null), language)}
          </span>
        </div>
      </div>

      {errorMsg && <div className="status-banner error">{errorMsg}</div>}
    </div>
  );
};

export default ProfileDetails;
