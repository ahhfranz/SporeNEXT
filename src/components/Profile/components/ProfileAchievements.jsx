import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useAchievements } from '../../../context/AchievementContext';
import loadingIcon from '../../../assets/loading.png';
import achievementsBadge from '../../../assets/achievements.png';
import './ProfileAchievements.css';

import img1 from '../../../assets/achievements/sporenext_achievement_id1.webp';
import img2 from '../../../assets/achievements/sporenext_achievement_id2.webp';
import img3 from '../../../assets/achievements/sporenext_achievement_id3.webp';
import img4 from '../../../assets/achievements/sporenext_achievement_id4.webp';
import img5 from '../../../assets/achievements/sporenext_achievement_id5.webp';
import img6 from '../../../assets/achievements/sporenext_achievement_id6.webp';
import img7 from '../../../assets/achievements/sporenext_achievement_id7.webp';
import img8 from '../../../assets/achievements/sporenext_achievement_id8.webp';
import img9 from '../../../assets/achievements/sporenext_achievement_id9.webp';
import img10 from '../../../assets/achievements/sporenext_achievement_id10.webp';
import img11 from '../../../assets/achievements/sporenext_achievement_id11.webp';
import img12 from '../../../assets/achievements/sporenext_achievement_id12.webp';
import img13 from '../../../assets/achievements/sporenext_achievement_id13.webp';
import img14 from '../../../assets/achievements/sporenext_achievement_id14.webp';
import img15 from '../../../assets/achievements/sporenext_achievement_id15.webp';
import img16 from '../../../assets/achievements/sporenext_achievement_id16.webp';
import img17 from '../../../assets/achievements/sporenext_achievement_id17.webp';
import img18 from '../../../assets/achievements/sporenext_achievement_id18.webp';
import img19 from '../../../assets/achievements/sporenext_achievement_id19.webp';
import imgSecret from '../../../assets/achievements/sporenext_achievement_secret.webp';

const iconMap = {
  img1, img2, img3, img4, img5, img6, img7, img8, img9, img10,
  img11, img12, img13, img14, img15, img16, img17, img18, img19,
  secret: imgSecret
};

const ProfileAchievements = ({ profile, isViewingOthers, achievementsData }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { unlockedAchievements, achievementsMeta } = useAchievements();

  const [hoveredId, setHoveredId] = useState(null);
  const [alignment, setAlignment] = useState('center');
  const [tooltipStyle, setTooltipStyle] = useState({});

  const isOwnProfile = isViewingOthers !== undefined ? !isViewingOthers : (!profile || profile.id === user?.id);
  const viewedAchievements = isOwnProfile ? (unlockedAchievements || {}) : (achievementsData || {});

  const handleMouseEnter = (e, id) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mainContent = document.querySelector('.main-content');
    const mainRect = mainContent
      ? mainContent.getBoundingClientRect()
      : { left: 0, right: window.innerWidth };

    const iconCenter = rect.left + rect.width / 2;
    const leftDist = iconCenter - mainRect.left;
    const rightDist = mainRect.right - iconCenter;

    let align = 'center';
    if (leftDist < 135) {
      align = 'left';
    } else if (rightDist < 135) {
      align = 'right';
    }

    const style = {
      position: 'fixed',
      top: `${rect.top - 8}px`,
      transform: 'translateY(-100%)',
      zIndex: 9999,
    };
    if (align === 'center') {
      style.left = `${rect.left + rect.width / 2}px`;
      style.transform = 'translateX(-50%) translateY(-100%)';
    } else if (align === 'left') {
      style.left = `${rect.left - 20}px`;
    } else {
      style.right = `${window.innerWidth - rect.right - 20}px`;
      style.left = 'auto';
    }

    setTooltipStyle(style);
    setAlignment(align);
    setHoveredId(id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    setAlignment('center');
    setTooltipStyle({});
  };

  // build achievements list dynamically
  const achievements = (achievementsMeta && achievementsMeta.length > 0)
    ? achievementsMeta.map((meta) => {
      const unlocked = !!viewedAchievements[meta.id];
      const unlockedAt = viewedAchievements[meta.id]?.unlockedAt || null;
      const isSecret = !!meta.is_secret;

      let name = language === 'en' ? meta.name_en : meta.name_es;
      let desc = language === 'en' ? meta.desc_en : meta.desc_es;
      let how = language === 'en' ? meta.how_en : meta.how_es;

      // secret achievements descriptions
      if (isSecret && !unlocked) {
        name = t('profile.achievements.secretTitle');
        desc = t('profile.achievements.secretMaskDesc') || '???';
        how = '???';
      }

      return {
        id: meta.id,
        name,
        desc,
        how,
        unlocked,
        unlockedAt,
        icon: iconMap[meta.icon_key] || img1,
        secret: isSecret
      };
    })
    : Array.from({ length: 19 }, (_, i) => {
      const id = `id${i + 1}`;
      const isSecret = i >= 15;
      const unlocked = !!viewedAchievements[id];
      return {
        id,
        name: isSecret && !unlocked ? t('profile.achievements.secretTitle') : id,
        desc: '...',
        how: '...',
        unlocked,
        unlockedAt: viewedAchievements[id]?.unlockedAt || null,
        icon: iconMap[`img${i + 1}`] || img1,
        secret: isSecret
      };
    });

  const visibleAchievements = achievements.filter(ach => !ach.secret || ach.unlocked);
  const lockedSecretCount = achievements.filter(ach => ach.secret && !ach.unlocked).length;
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="profile-card glass-panel profile-achievements-card">
      <div className="card-header-row">
        <h2 className="card-title">
          <Trophy size={18} />
          <span>{t('profile.achievements.title')}</span>
        </h2>
      </div>

      <div className="achievements-progress-hero">
        <div className="progress-star-wrapper">
          <img src={achievementsBadge} alt="Achievements" className="progress-badge-icon" />
        </div>
        <div className="progress-details">
          <div className="progress-labels">
            <span className="progress-stats">{unlockedCount} / {totalCount} {t('profile.unlocked')}</span>
            <span className="progress-percent">{progressPercent}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="achievements-grid">
        {visibleAchievements.map((ach) => {
          const isHovered = hoveredId === ach.id;
          return (
            <div
              key={ach.id}
              className={`achievement-item ${isHovered ? `align-${alignment}` : ''}`}
            >
              <div
                className={`achievement-icon-wrapper ${ach.unlocked ? 'unlocked' : 'locked'}`}
                onMouseEnter={(e) => handleMouseEnter(e, ach.id)}
                onMouseLeave={handleMouseLeave}
              >
                <img src={ach.icon} alt={ach.name} className="achievement-icon" />
              </div>
              <div
                className={`achievement-tooltip${isHovered ? ' is-active' : ''}`}
                style={isHovered ? tooltipStyle : undefined}
              >
                <div className="tooltip-header">
                  <span className="tooltip-name">{ach.name}</span>
                  <span className={`tooltip-status ${ach.unlocked ? 'unlocked' : 'locked'}`}>
                    {ach.unlocked ? t('profile.achievements.unlocked') : t('profile.achievements.locked')}
                  </span>
                </div>
                <div className="tooltip-body">
                  <p className="tooltip-how">{ach.how}</p>
                  <p className="tooltip-quote">"{ach.desc}"</p>
                </div>
                {ach.unlocked && (
                  <div className="tooltip-footer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={loadingIcon} alt="Date" className="tooltip-date-icon" style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                    <span className="tooltip-date">
                      {t('profile.achievements.unlockedOn')}: {ach.unlockedAt}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {lockedSecretCount > 0 && (
          <div
            className={`achievement-item ${hoveredId === 'secret' ? `align-${alignment}` : ''}`}
          >
            <div
              className="achievement-icon-wrapper secret-badge-wrapper"
              onMouseEnter={(e) => handleMouseEnter(e, 'secret')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="secret-badge-count">+{lockedSecretCount}</span>
            </div>
            <div
              className={`achievement-tooltip${hoveredId === 'secret' ? ' is-active' : ''}`}
              style={hoveredId === 'secret' ? tooltipStyle : undefined}
            >
              <div className="tooltip-header">
                <span className="tooltip-name">{t('profile.achievements.secretTitle')}</span>
              </div>
              <p className="tooltip-desc">
                {t('profile.achievements.secretDesc').replace('{count}', lockedSecretCount)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileAchievements;
