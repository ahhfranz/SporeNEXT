import React, { useState } from 'react';
import { Square, RefreshCw, FolderOpen, Play } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import launchIcon from '../../../assets/lauch.png';

const HomeBanner = ({ installedGames, activeLaunch, launchGame, closeGame, detectInstalledGames }) => {
  const { t } = useLanguage();
  const { user, profile, isOffline } = useAuth();
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetect = async () => {
    if (isDetecting) return;
    setIsDetecting(true);
    if (detectInstalledGames) {
      await detectInstalledGames();
    }
    setTimeout(() => {
      setIsDetecting(false);
    }, 1500);
  };

  const isInstalled = installedGames?.sporega?.installed;
  const gamePath = installedGames?.sporega?.path;
  const gameVersion = installedGames?.sporega?.version;

  const username = isOffline
    ? (t('settings.nomadUser') || 'Nomad')
    : (profile?.username || user?.user_metadata?.username || 'user');
  const subtitleText = t('home.bannerSubtitle')
    ? t('home.bannerSubtitle').replace('{username}', username)
    : `Welcome, ${username}!`;

  return (
    <div className="home-banner">
      <div className="home-left-section">
        <div className="home-header-row-new">
          <div className="home-title-group">
            <h2 className="home-game-title">
              <span className="title-spore">SPORE</span>
              <span className="title-next">NEXT</span>
            </h2>
            <p className="home-game-subtitle">
              {subtitleText}
            </p>
          </div>
        </div>

        <div className="home-footer-row-new">
          <div className="launch-buttons-group">
            {activeLaunch.game === 'sporega' && activeLaunch.status !== 'idle' ? (
              <button
                className={`play-mega-btn play-btn-sporega ${activeLaunch.status}`}
                onClick={closeGame}
                disabled={activeLaunch.status === 'launching'}
              >
                {activeLaunch.status === 'launching' ? (
                  <>
                    <img src={launchIcon} alt="Loading..." className="spinner-icon" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    <span>{t('home.launching')}</span>
                  </>
                ) : (
                  <>
                    <Square size={16} fill="currentColor" />
                    <span>{t('home.closeSporega')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                className={`play-mega-btn play-btn-sporega ${!isInstalled ? 'not-installed' : ''}`}
                onClick={() => launchGame('sporega')}
                disabled={activeLaunch.status !== 'idle' || !isInstalled}
              >
                <Play size={18} fill="currentColor" />
                <span>{!isInstalled ? t('home.notDetected') : t('main.play') || 'PLAY'}</span>
              </button>
            )}

            {!isInstalled && (
              <button
                className="home-refresh-btn"
                onClick={handleDetect}
                disabled={activeLaunch.status !== 'idle' || isDetecting}
                data-tooltip={t('home.reDetectGame')}
              >
                <RefreshCw size={18} className={isDetecting ? 'spin-animation' : ''} />
              </button>
            )}

            {/* game directory button */}
            {isInstalled && gamePath && (
              <button
                className="home-folder-btn"
                onClick={() => {
                  if (window.electronAPI && window.electronAPI.openPath) {
                    window.electronAPI.openPath(gamePath);
                  }
                }}
                disabled={activeLaunch.status === 'launching'}
                data-tooltip={t('home.openInstallFolder')}
              >
                <FolderOpen size={18} />
              </button>
            )}
          </div>

          <div className="home-game-version">
            {t('home.gameVersionLabel') || 'Game version'}: {gameVersion || '3.10.0.22'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeBanner;
