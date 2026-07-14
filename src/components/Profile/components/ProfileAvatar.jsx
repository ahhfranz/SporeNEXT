import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import ArchetypeTestModal from './modals/ArchetypeTestModal';
import AbandonPhilosophyModal from './modals/AbandonPhilosophyModal';
import './ProfileAvatar.css';

// import icons
import SeekerIcon from '../../../assets/archetypes/Seeker.png';
import WandererIcon from '../../../assets/archetypes/Wanderer.png';
import BardIcon from '../../../assets/archetypes/Bard.png';
import DiplomatIcon from '../../../assets/archetypes/Diplomat.png';
import EcologistIcon from '../../../assets/archetypes/Ecologist.png';
import KnightIcon from '../../../assets/archetypes/Knight.png';
import ScientistIcon from '../../../assets/archetypes/Scientist.png';
import ShamanIcon from '../../../assets/archetypes/Shaman.png';
import TraderIcon from '../../../assets/archetypes/Trader.png';
import WarriorIcon from '../../../assets/archetypes/Warrior.png';
import ZealotIcon from '../../../assets/archetypes/Zealot.png';

const archetypeIcons = {
  Seeker: SeekerIcon,
  Wanderer: WandererIcon,
  Bard: BardIcon,
  Diplomat: DiplomatIcon,
  Ecologist: EcologistIcon,
  Knight: KnightIcon,
  Scientist: ScientistIcon,
  Shaman: ShamanIcon,
  Trader: TraderIcon,
  Warrior: WarriorIcon,
  Zealot: ZealotIcon
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

const getArchetypeKey = (val) => {
  if (!val) return 'Seeker';
  const clean = val.trim();
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  return archetypeColors[formatted] ? formatted : 'Seeker';
};

const ProfileAvatar = ({
  isGloballyEditing,
  displayAvatarUrl,
  onAvatarFileChange,
  isOnline,
  archetype,
  archetypeBreakdown,
  isViewingOthers,
  onArchetypeChange
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isAbandonOpen, setIsAbandonOpen] = useState(false);

  const userId = user?.id || 'nomad';
  const archetypeKey = getArchetypeKey(archetype);
  const archetypeColor = archetypeColors[archetypeKey];
  const archetypeIcon = archetypeIcons[archetypeKey];

  let breakdown = null;
  if (archetypeKey !== 'Seeker') {
    if (archetypeBreakdown) {
      if (typeof archetypeBreakdown === 'string') {
        try {
          breakdown = JSON.parse(archetypeBreakdown);
        } catch (e) {
        }
      } else {
        breakdown = archetypeBreakdown;
      }
    } else if (!isViewingOthers) {
      const savedResults = localStorage.getItem(`sporenext_archetype_results_${userId}`);
      if (savedResults) {
        try {
          breakdown = JSON.parse(savedResults);
        } catch (e) {
        }
      }
    }
  }

  const primaryArchetype = breakdown?.[0];
  const primaryName = primaryArchetype
    ? (t(`profile.archetypeDetails.${primaryArchetype.name}.name`) || primaryArchetype.name)
    : '';
  const abbreviatedName = primaryName.slice(0, 3);

  const handleTriggerAvatarUpload = () => {
    document.getElementById('avatar-upload-input')?.click();
  };

  const handleBadgeClick = () => {
    if (isViewingOthers) return;

    if (archetypeKey === 'Seeker') {
      setIsTestOpen(true);
    } else {
      setIsAbandonOpen(true);
    }
  };

  const handleConfirmAbandon = () => {
    setIsAbandonOpen(false);

    localStorage.removeItem(`sporenext_archetype_results_${userId}`);

    if (onArchetypeChange) {
      onArchetypeChange('Seeker');
    }
    setIsTestOpen(true);
  };

  return (
    <div className="profile-avatar-wrapper">
      <img
        src={displayAvatarUrl}
        alt="Avatar"
        className="profile-avatar"
        style={{ borderColor: archetypeColor }}
      />
      <div className={`profile-status-indicator ${isOnline ? 'online' : 'offline'}`}></div>

      <div
        className={`profile-archetype-badge ${!isViewingOthers ? 'editable' : ''}`}
        style={{ '--archetype-color': archetypeColor }}
        onClick={handleBadgeClick}
      >
        <img src={archetypeIcon} alt={archetypeKey} className="profile-archetype-badge-icon" />

        {!isTestOpen && !isAbandonOpen && (
          <div className="archetype-tooltip">
            <div className="tooltip-header">
              <div className="archetype-tooltip-title-row">
                <img src={archetypeIcon} alt={archetypeKey} className="tooltip-archetype-icon" />
                <span className="tooltip-name">
                  {t(`profile.archetypeDetails.${archetypeKey}.name`) || archetypeKey}
                </span>
              </div>
              <span className="tooltip-status" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: archetypeColor, border: `1px solid ${archetypeColor}` }}>
                {t(`profile.archetypeDetails.${archetypeKey}.philosophy`)}
              </span>
            </div>
            <div className="tooltip-body">
              <p className="tooltip-quote">
                {t(`profile.archetypeDetails.${archetypeKey}.desc`)}
              </p>
            </div>

            {breakdown && breakdown.length > 0 && (
              <div className="tooltip-breakdown">
                <div className="tooltip-breakdown-divider" />
                <span className="tooltip-breakdown-title">
                  {t('profile.resultsBreakdown')}
                </span>

                <div className="tooltip-chart-container">
                  <div className="tooltip-chart-wrapper">
                    <svg viewBox="0 0 36 36" className="tooltip-doughnut-chart">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="3.5"
                      />
                      {(() => {
                        let cumulativePercentage = 0;
                        return breakdown
                          .filter(r => r.percentage > 0)
                          .map((res) => {
                            const offset = -cumulativePercentage;
                            cumulativePercentage += res.percentage;
                            return (
                              <circle
                                key={res.name}
                                cx="18"
                                cy="18"
                                r="15.91549430918954"
                                fill="transparent"
                                stroke={res.color}
                                strokeWidth="3.5"
                                strokeDasharray={`${res.percentage} 100`}
                                strokeDashoffset={offset}
                                strokeLinecap="butt"
                                className="chart-segment"
                              />
                            );
                          });
                      })()}
                    </svg>
                    <div className="chart-center-label">
                      <span className="chart-center-value">
                        {primaryArchetype?.percentage}%
                      </span>
                      <span className="chart-center-name">
                        {abbreviatedName}
                      </span>
                    </div>
                  </div>

                  <div className="tooltip-chart-legend">
                    {breakdown.filter(r => r.percentage > 0).map((res) => (
                      <div key={res.name} className="legend-item">
                        <div className="legend-marker" style={{ backgroundColor: res.color }} />
                        <span className="legend-name" data-tooltip={t(`profile.archetypeDetails.${res.name}.name`)}>
                          {t(`profile.archetypeDetails.${res.name}.name`) || res.name}
                        </span>
                        <span className="legend-pct">{res.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ArchetypeTestModal
        isOpen={isTestOpen}
        onClose={() => setIsTestOpen(false)}
        onSelectArchetype={onArchetypeChange}
      />

      <AbandonPhilosophyModal
        isOpen={isAbandonOpen}
        onClose={() => setIsAbandonOpen(false)}
        onConfirm={handleConfirmAbandon}
        currentArchetype={archetypeKey}
      />

      {isGloballyEditing && (
        <div className="profile-avatar-edit-overlay" onClick={handleTriggerAvatarUpload}>
          <Camera size={20} />
          <input
            type="file"
            id="avatar-upload-input"
            className="file-upload-hidden"
            accept="image/*"
            onChange={onAvatarFileChange}
          />
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar;
