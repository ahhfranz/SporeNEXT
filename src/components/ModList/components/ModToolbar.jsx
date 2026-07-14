import React, { useState, useEffect } from 'react';
import { Search, Layers, FolderPlus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import optimizationIcon from '../../../assets/category_optimization.png';
import fixesIcon from '../../../assets/category_fixes.png';
import gameplayIcon from '../../../assets/category_gameplay.png';
import texturesIcon from '../../../assets/category_textures.png';
import uiIcon from '../../../assets/category_ui.png';
import editorsIcon from '../../../assets/category_editors.png';
import dependenciesIcon from '../../../assets/category_dependencies.png';
import galaxyResetIcon from '../../../assets/category_galaxyreset.png';
import loadingIcon from '../../../assets/loading.png';
import logoRefreshIcon from '../../../assets/logo_refresh.png';

const ModToolbar = ({ searchTerm, onSearchChange, selectedCategory, onCategoryChange, loading, onReload, onGalaxyReset, onOpenManualMods }) => {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const checkCooldown = () => {
      const lastRefresh = localStorage.getItem('sporenext_last_refresh_time');
      if (lastRefresh) {
        const elapsed = Date.now() - Number(lastRefresh);
        if (elapsed < 60000) {
          setCooldown(Math.ceil((60000 - elapsed) / 1000));
          return;
        }
      }
      setCooldown(0);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshClick = () => {
    if (loading || cooldown > 0) return;
    localStorage.setItem('sporenext_last_refresh_time', Date.now().toString());
    setCooldown(60);
    onReload();
  };

  return (
    <div className="mod-toolbar">
      {/* Search */}
      <div className="search-wrap">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder={t('mods.searchPlaceholder')}
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      {/* Refresh button — left of filters */}
      <button 
        className="tool-btn refresh-list-btn" 
        onClick={handleRefreshClick}
        disabled={loading || cooldown > 0}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img 
          src={isHovered ? logoRefreshIcon : loadingIcon} 
          alt="Reload" 
          className={loading ? 'spin-icon' : ''} 
          style={{ width: '14px', height: '14px' }} 
        />
        <span>{cooldown > 0 ? `${t('mods.refresh')} (${cooldown}s)` : t('mods.refresh')}</span>
      </button>

      {/* Manual Mods button — right of reload button */}
      <button className="tool-btn manual-mods-btn" onClick={onOpenManualMods}>
        <FolderPlus size={14} />
        <span>{t('mods.manualMods')}</span>
      </button>

      {/* Galaxy Reset button — right of reload button */}
      <button className="tool-btn galaxy-btn" onClick={onGalaxyReset}>
        <img src={galaxyResetIcon} alt="Galaxy Reset" className="category-tab-icon galaxy-icon" />
        <span>{t('mods.galaxyReset')}</span>
      </button>

      {/* Category filters */}
      <div className="toolbar-filters">
        <button
          className={`filter-btn ${selectedCategory === 'All' ? 'active' : ''}`}
          onClick={() => onCategoryChange('All')}
        >
          <Layers size={14} />
          <span>{t('mods.filterAll')}</span>
        </button>

        <button
          className={`filter-btn category-optimization ${selectedCategory === 'Optimization' ? 'active' : ''}`}
          onClick={() => onCategoryChange('Optimization')}
        >
          <img src={optimizationIcon} alt="Optimization" className="category-tab-icon" />
          <span>{t('mods.filterOptimization')}</span>
        </button>

        <button
          className={`filter-btn category-fixes ${selectedCategory === 'Fixes' ? 'active' : ''}`}
          onClick={() => onCategoryChange('Fixes')}
        >
          <img src={fixesIcon} alt="Fixes" className="category-tab-icon" />
          <span>{t('mods.filterFixes')}</span>
        </button>

        <button
          className={`filter-btn category-gameplay ${selectedCategory === 'Gameplay' ? 'active' : ''}`}
          onClick={() => onCategoryChange('Gameplay')}
        >
          <img src={gameplayIcon} alt="Gameplay" className="category-tab-icon" />
          <span>{t('mods.filterGameplay')}</span>
        </button>

        <button
          className={`filter-btn category-textures ${selectedCategory === 'Textures' ? 'active' : ''}`}
          onClick={() => onCategoryChange('Textures')}
        >
          <img src={texturesIcon} alt="Textures" className="category-tab-icon" />
          <span>{t('mods.filterTextures')}</span>
        </button>

        <button
          className={`filter-btn category-ui ${selectedCategory === 'UI' ? 'active' : ''}`}
          onClick={() => onCategoryChange('UI')}
        >
          <img src={uiIcon} alt="UI" className="category-tab-icon" />
          <span>{t('mods.filterUI')}</span>
        </button>

        <button
          className={`filter-btn category-editors ${selectedCategory === 'Editors' ? 'active' : ''}`}
          onClick={() => onCategoryChange('Editors')}
        >
          <img src={editorsIcon} alt="Editors" className="category-tab-icon" />
          <span>{t('mods.filterEditors')}</span>
        </button>

        <button
          className={`filter-btn category-dependencies ${selectedCategory === 'Dependencies' ? 'active' : ''}`}
          onClick={() => onCategoryChange('Dependencies')}
        >
          <img src={dependenciesIcon} alt="Dependencies" className="category-tab-icon" />
          <span>{t('mods.filterDependencies')}</span>
        </button>
      </div>

    </div>
  );
};

export default ModToolbar;
