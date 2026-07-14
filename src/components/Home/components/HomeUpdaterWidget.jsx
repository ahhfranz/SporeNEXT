import React from 'react';
import { ArrowUpCircle, RefreshCw, Download } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useLauncherUpdate } from '../../../hooks/useLauncherUpdate';
import loadingIcon from '../../../assets/loading.png';

const HomeUpdaterWidget = () => {
  const { t } = useLanguage();
  const { launcherUpdate, checkForUpdates, downloadUpdate, installUpdate } = useLauncherUpdate();

  const handleLauncherUpdate = () => {
    if (launcherUpdate.state === 'available') {
      downloadUpdate();
    } else if (launcherUpdate.state === 'ready-to-install') {
      installUpdate();
    } else if (launcherUpdate.state === 'error') {
      checkForUpdates();
    }
  };

  return (
    <div className="home-updater-widget">
      <div className="evolution-container">
        <div className="evolution-header">
          <span className={`evolution-badge ${launcherUpdate.available ? 'warning' : 'success'}`}>
            BUILD
          </span>
          <span className="evolution-version-pill">v{launcherUpdate.currentVersion}</span>
        </div>

        {/* Animation */}
        <div className={`spore-dna-animation ${launcherUpdate.state === 'downloading' || launcherUpdate.state === 'checking' ? 'mutating' : ''} ${launcherUpdate.available ? 'update-available' : 'up-to-date'}`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="dna-node-pair" style={{ '--index': i }}>
              <div className="dna-node node-top"></div>
              <div className="dna-line"></div>
              <div className="dna-node node-bottom"></div>
            </div>
          ))}
        </div>

        <div className="evolution-body">
          {launcherUpdate.available ? (
            <div className="evolution-update-flow">
              <div className="evolution-text-group">
                <h4 className="evolution-status-title warning">
                  {launcherUpdate.state === 'error'
                    ? t('home.mutationError')
                    : (launcherUpdate.state === 'ready-to-install'
                      ? t('home.mutationReady')
                      : t('home.newMutationAvailable')
                    )
                  }
                </h4>
                <p className="evolution-status-desc">
                  {launcherUpdate.state === 'error'
                    ? launcherUpdate.error
                    : (launcherUpdate.state === 'ready-to-install'
                      ? t('home.evolutionReadyDesc')
                      : t('home.evolveVersionDesc').replace('{version}', launcherUpdate.newVersion)
                    )
                  }
                </p>
              </div>

              <button
                className={`evolution-btn ${launcherUpdate.state}`}
                onClick={handleLauncherUpdate}
                disabled={launcherUpdate.state === 'checking' || launcherUpdate.state === 'downloading'}
              >
                {launcherUpdate.state === 'checking' && (
                  <>
                    <img src={loadingIcon} alt="Checking..." className="spinner-icon-inline" style={{ width: '12px', height: '12px', marginRight: '5px' }} />
                    <span>{t('home.checkingBtn')}</span>
                  </>
                )}
                {launcherUpdate.state === 'downloading' && (
                  <>
                    <img src={loadingIcon} alt="Downloading..." className="spinner-icon-inline" style={{ width: '12px', height: '12px', marginRight: '5px' }} />
                    <span>{t('home.evolvingLauncher')} ({launcherUpdate.progress?.percent || 0}%)</span>
                  </>
                )}
                {launcherUpdate.state === 'ready-to-install' && (
                  <>
                    <ArrowUpCircle size={12} style={{ marginRight: '6px' }} />
                    <span>{t('home.installBtn')}</span>
                  </>
                )}
                {launcherUpdate.state === 'error' && (
                  <>
                    <RefreshCw size={12} style={{ marginRight: '6px' }} />
                    <span>{t('home.retryBtn')}</span>
                  </>
                )}
                {(launcherUpdate.state === 'available' || launcherUpdate.state === 'idle') && (
                  <>
                    <Download size={12} style={{ marginRight: '6px' }} />
                    <span>{t('home.evolveBtn')}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="evolution-success-flow">
              <h4 className="evolution-status-title success">{t('home.fullyEvolved') || "You're up to date!"}</h4>
              <p className="evolution-status-desc">
                {t('home.evolvedVersionDesc')
                  ? t('home.evolvedVersionDesc').replace('{version}', launcherUpdate.currentVersion)
                  : `Spore NEXT is at the peak of evolution (v${launcherUpdate.currentVersion})`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeUpdaterWidget;
