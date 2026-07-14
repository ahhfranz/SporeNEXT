import React, { useEffect, useRef } from 'react';
import { Download, Plus, Trash2, ExternalLink, RefreshCw, FileX } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useModData } from '../hooks/useModData';

const ModContextMenu = ({ x, y, mod, onClose, onAction, loadModsSilent }) => {
  const { t } = useLanguage();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    // capture listener to ensure it fires before other context events
    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('contextmenu', handleOutsideClick, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('contextmenu', handleOutsideClick, true);
    };
  }, [onClose]);

  const adjustPosition = () => {
    const menuWidth = 220;
    const menuHeight = 180;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > windowWidth) {
      adjustedX = windowWidth - menuWidth - 10;
    }
    if (y + menuHeight > windowHeight) {
      adjustedY = windowHeight - menuHeight - 10;
    }

    return { top: adjustedY, left: adjustedX };
  };

  const pos = adjustPosition();

  const getPrimaryActionDetails = () => {
    switch (mod.status) {
      case 'installed':
        return {
          label: t('mods.uninstall'),
          icon: <Trash2 size={15} />,
          action: () => onAction(mod.id, 'installed'),
          className: 'menu-item-primary uninstall'
        };
      case 'downloaded':
        return {
          label: t('mods.install'),
          icon: <Plus size={15} />,
          action: () => onAction(mod.id, 'downloaded'),
          className: 'menu-item-primary install'
        };
      case 'update':
        return {
          label: t('mods.update'),
          icon: <RefreshCw size={15} className="spin-on-update" />,
          action: () => onAction(mod.id, 'update'),
          className: 'menu-item-primary update'
        };
      default: { // available
        const hasSource = (mod.github && mod.github.trim() !== '') || (mod.download_url && mod.download_url.trim() !== '');
        return {
          label: t('mods.download'),
          icon: <Download size={15} />,
          action: () => onAction(mod.id, 'available'),
          className: 'menu-item-primary download',
          disabled: !hasSource
        };
      }
    }
  };

  const { downloadProgresses } = useModData();
  const isAnyModOperationInProgress = Object.values(downloadProgresses || {}).some(
    p => p.status === 'downloading' || p.status === 'installing' || p.status === 'uninstalling'
  );

  const primaryAction = getPrimaryActionDetails();
  const hasGithub = mod.github && mod.github.trim() !== '';

  // cache deletion is possible if the file is downloaded
  const isCacheDeletable = !!mod.isDownloaded;

  const handleDeleteCache = async () => {
    if (!isCacheDeletable || isAnyModOperationInProgress) return;
    try {
      if (window.electronAPI?.deleteCacheFile && mod.filename) {
        const success = await window.electronAPI.deleteCacheFile(mod.filename);
        if (success) {
          if (loadModsSilent) {
            await loadModsSilent();
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete mod cache file:', err);
    } finally {
      onClose();
    }
  };

  const handleOpenGithub = () => {
    if (!hasGithub) return;
    window.open(mod.github, '_blank');
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="mod-context-menu"
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        zIndex: 10000,
      }}
    >
      <div className="menu-group">
        <button
          className={`menu-item ${primaryAction.className}`}
          onClick={() => {
            primaryAction.action();
            onClose();
          }}
          disabled={primaryAction.disabled}
        >
          <span className="menu-item-label">{primaryAction.label}</span>
          <span className="menu-item-icon">{primaryAction.icon}</span>
        </button>
      </div>

      <div className="menu-divider" />

      <div className="menu-group">
        <button
          className="menu-item"
          onClick={handleOpenGithub}
          disabled={!hasGithub}
        >
          <span className="menu-item-label">{t('mods.openGithub')}</span>
          <span className="menu-item-icon"><ExternalLink size={15} /></span>
        </button>
      </div>

      <div className="menu-divider" />

      <div className="menu-group">
        <button
          className="menu-item danger"
          onClick={handleDeleteCache}
          disabled={!isCacheDeletable || isAnyModOperationInProgress}
        >
          <span className="menu-item-label">{t('mods.deleteFromCache')}</span>
          <span className="menu-item-icon"><FileX size={15} /></span>
        </button>
      </div>
    </div>
  );
};

export default ModContextMenu;
