import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

const HomeLiveStatus = () => {
  const { t } = useLanguage();
  const { onlineCount, isNetworkOnline } = useAuth();

  // Mock avatars for the visual design to match the screenshot
  const mockAvatars = [
    'https://robohash.org/spore1.png?set=set5&bgset=bg1',
    'https://robohash.org/spore2.png?set=set5&bgset=bg2',
    'https://robohash.org/spore3.png?set=set5&bgset=bg1',
    'https://robohash.org/spore4.png?set=set5&bgset=bg2'
  ];

  return (
    <div className="galactic-network-card">
      <div className="network-header">
        <h4 className="network-title">
          <span>{t('home.galacticNetwork') || 'GALACTIC NETWORK'}</span>
        </h4>
        <span className={`network-status-indicator ${isNetworkOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>{isNetworkOnline ? (t('home.online') || 'Online') : (t('home.offline') || 'Offline')}</span>
        </span>
      </div>

      <div className="active-players-section">
        <div className="active-count-number">
          {isNetworkOnline ? Math.max(2, onlineCount) : '0'}{' '}
          <span className="active-count-label">{t('home.playersActive') || 'players active'}</span>
        </div>

      </div>

    </div>
  );
};

export default HomeLiveStatus;
