import React from 'react';
import { Download, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import optimizationIcon from '../../../assets/category_optimization.png';
import gameplayIcon from '../../../assets/category_gameplay.png';
import fixesIcon from '../../../assets/category_fixes.png';
import texturesIcon from '../../../assets/category_textures.png';
import uiIcon from '../../../assets/category_ui.png';
import editorsIcon from '../../../assets/category_editors.png';
import dependenciesIcon from '../../../assets/category_dependencies.png';
import like1Icon from '../../../assets/like1.png';
import like2Icon from '../../../assets/like2.png';

const GithubIcon = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const CATEGORY_ICONS = {
  Optimization: <img src={optimizationIcon} alt="Optimization" className="category-row-icon" />,
  Fixes: <img src={fixesIcon} alt="Fixes" className="category-row-icon" />,
  Gameplay: <img src={gameplayIcon} alt="Gameplay" className="category-row-icon" />,
  Textures: <img src={texturesIcon} alt="Textures" className="category-row-icon" />,
  UI: <img src={uiIcon} alt="UI" className="category-row-icon" />,
  Editors: <img src={editorsIcon} alt="Editors" className="category-row-icon" />,
  Dependencies: <img src={dependenciesIcon} alt="Dependencies" className="category-row-icon" />,
};

const ModRow = ({ mod, isLiked, progressInfo, onAction, onLike, setActiveTab, onContextMenu, isContextMenuOpen }) => {
  const { t, language } = useLanguage();
  const { isOffline, isNetworkOnline } = useAuth();
  const catKey = (mod.category || 'optimization').toLowerCase();
  const icon = CATEGORY_ICONS[mod.category] ?? CATEGORY_ICONS.Optimization;

  const isLikeDisabled = isOffline || !isNetworkOnline;
  const likeTitle = isOffline
    ? t('mods.loginToLike')
    : (!isNetworkOnline
      ? t('mods.offlineActionError')
      : (isLiked ? t('mods.unlike') : t('mods.like')));

  const isDownloadDisabled = !isNetworkOnline;

  const displayDescription =
    (language === 'es' && mod.description_es) ||
    (language === 'en' && mod.description_en) ||
    mod.description;

  return (
    <div
      className={`mod-row status-${mod.status} ${isContextMenuOpen ? 'context-menu-active' : ''}`}
      onContextMenu={onContextMenu}
    >
      <div className="mod-status-border" />

      {/* name + description */}
      <div className="col-name">
        <div className={`mod-icon-wrapper cat-${catKey}`}>{icon}</div>
        <div className="mod-name-info">
          <span className="mod-title" data-tooltip={mod.name}>{mod.name}</span>
          <span className="mod-filename" data-tooltip={mod.filename}>{mod.filename}</span>
          <p className="mod-description" data-tooltip={displayDescription}>{displayDescription}</p>
        </div>
      </div>

      {/* button / progress */}
      <div className="col-action">
        {progressInfo?.status === 'downloading' || progressInfo?.status === 'installing' || progressInfo?.status === 'uninstalling' ? (
          <div className={`download-progress-container status-${progressInfo.status}`}>
            <div className="download-progress-text">
              <span>
                {progressInfo.status === 'downloading' && t('mods.downloading')}
                {progressInfo.status === 'installing' && t('mods.installing')}
                {progressInfo.status === 'uninstalling' && t('mods.uninstalling')}
              </span>
              {progressInfo.status === 'downloading' && <span>{progressInfo.percent}%</span>}
            </div>
            <div className="download-progress-bar-bg">
              <div
                className="download-progress-bar-fill"
                style={{
                  width: progressInfo.status === 'downloading' ? `${progressInfo.percent}%` : '100%',
                  background: progressInfo.status === 'uninstalling' ? '#ff4d4d' : 'var(--primary)'
                }}
              />
            </div>
          </div>
        ) : mod.status === 'installed' ? (
          <button className="install-btn installed-badge" onClick={() => onAction(mod.id, mod.status)}>
            <span className="state-default"><CheckCircle2 size={14} /><span>{t('mods.installed')}</span></span>
            <span className="state-hover"><Trash2 size={14} /><span>{t('mods.uninstall')}</span></span>
          </button>
        ) : mod.status === 'downloaded' ? (
          <button className="install-btn downloaded-btn" onClick={() => onAction(mod.id, mod.status)}>
            <Plus size={14} /><span>{t('mods.install')}</span>
          </button>
        ) : mod.status === 'update' ? (
          <button
            className="install-btn update-btn"
            onClick={() => onAction(mod.id, mod.status)}
            disabled={isDownloadDisabled}
            data-tooltip={isDownloadDisabled ? t('mods.offlineActionError') : undefined}
          >
            <AlertCircle size={14} /><span>{t('mods.update')}</span>
          </button>
        ) : (!mod.github || mod.github.trim() === '') && (!mod.download_url || mod.download_url.trim() === '') ? (
          <button className="install-btn" disabled data-tooltip={t('mods.noSourceError')}>
            <span>{t('mods.unavailable')}</span>
          </button>
        ) : (
          <button
            className="install-btn"
            onClick={() => onAction(mod.id, mod.status)}
            disabled={isDownloadDisabled}
            data-tooltip={isDownloadDisabled ? t('mods.offlineActionError') : undefined}
          >
            <Download size={14} /><span>{t('mods.download')}</span>
          </button>
        )}
      </div>

      {/* size */}
      <div className="col-size">{mod.size}</div>

      {/* downloads */}
      <div className="col-downloads">{mod.downloads || 0}</div>

      {/* rating */}
      <div className="col-rating">
        <button
          className={`rating-btn ${isLiked ? 'liked' : ''}`}
          onClick={() => { if (!isLikeDisabled) onLike(mod.id); }}
          disabled={isLikeDisabled}
          data-tooltip={likeTitle}
        >
          <img src={isLiked ? like2Icon : like1Icon} alt="Like" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
          <span>{mod.likes || 0}</span>
        </button>
      </div>

      {/* author */}
      <div className="col-author">
        {mod.github_profile && !isOffline ? (
          <button
            className="author-link-btn"
            onClick={() => setActiveTab('profile', mod.github_profile)}
            data-tooltip={t('mods.viewAuthorProfile') || `View ${mod.author}'s profile`}
          >
            {mod.author}
          </button>
        ) : (
          mod.author
        )}
      </div>

      {/* github */}
      <div className="col-github">
        {mod.github ? (
          <a href={mod.github} target="_blank" rel="noopener noreferrer" className="github-btn" data-tooltip={t('mods.github')}>
            <GithubIcon size={14} /><span>GitHub</span>
          </a>
        ) : (
          <span className="no-github-tag">-</span>
        )}
      </div>

      {/* category */}
      <div className="col-category">
        <span className={`category-tag cat-${catKey}`}>
          {t(`mods.filter${mod.category}`) || mod.category}
        </span>
      </div>
    </div>
  );
};

export default ModRow;
