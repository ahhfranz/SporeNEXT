import React, { useRef, useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, ArrowDown } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

import categoryDependenciesImg from '../../../assets/popular_mods/category_dependencies.png';
import categoryEditorsImg from '../../../assets/popular_mods/category_editors.png';
import categoryFixesImg from '../../../assets/popular_mods/category_fixes.png';
import categoryGameplayImg from '../../../assets/popular_mods/category_gameplay.png';
import categoryOptimizationsImg from '../../../assets/popular_mods/category_optimizations.png';
import categoryTexturesImg from '../../../assets/popular_mods/category_textures.png';
import categoryUiImg from '../../../assets/popular_mods/category_ui.png';
import like1Icon from '../../../assets/like1.png';

const CATEGORY_COVER_MAP = {
  optimization: categoryOptimizationsImg,
  fixes: categoryFixesImg,
  gameplay: categoryGameplayImg,
  textures: categoryTexturesImg,
  ui: categoryUiImg,
  editors: categoryEditorsImg,
  dependencies: categoryDependenciesImg,
};

export const getModCategoryCover = (category) => {
  if (!category) return categoryOptimizationsImg;
  const key = category.toLowerCase().trim();
  if (key === 'optimization') return categoryOptimizationsImg;
  return CATEGORY_COVER_MAP[key] || categoryOptimizationsImg;
};

const HomePopularMods = ({ mods = [], likedMods = {}, setActiveTab, setSearchQuery }) => {
  const { t } = useLanguage();
  const scrollRef = useRef(null);

  const [scrollPercent, setScrollPercent] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // smooth wheel scroll refs
  const targetScrollLeftRef = useRef(0);
  const animationFrameIdRef = useRef(null);

  // sorts all mods by downloads counts (descending)
  const displayMods = [...mods]
    .sort((a, b) => {
      const diffDownloads = (b.downloads || 0) - (a.downloads || 0);
      if (diffDownloads !== 0) return diffDownloads;
      return (b.likes || 0) - (a.likes || 0);
    })
    .slice(0, 10);

  const fallbackMods = [
    { id: '1', name: 'Spore HD Textures', category: 'Textures', downloads: 12400, likes: 98, isMock: true },
    { id: '2', name: '60FPS Patch', category: 'Optimization', downloads: 8700, likes: 94, isMock: true },
    { id: '3', name: 'Spore Borderless', category: 'Optimization', downloads: 6200, likes: 92, isMock: true },
    { id: '4', name: '4GB Patch', category: 'Optimization', downloads: 5100, likes: 91, isMock: true },
    { id: '5', name: 'Dark UI (Spore)', category: 'UI', downloads: 3800, likes: 89, isMock: true },
  ];

  const finalModsList = displayMods.length > 0 ? displayMods : fallbackMods;

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);

      const maxScroll = scrollWidth - clientWidth;
      const percent = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
      setScrollPercent(percent);
    }
  };

  // sync ref for callback so wheel listener captures latest scroll update logic
  const updateScrollButtonsRef = useRef(updateScrollButtons);
  useEffect(() => {
    updateScrollButtonsRef.current = updateScrollButtons;
  });

  useEffect(() => {
    // wait for DOM rendering
    const timer = setTimeout(() => {
      updateScrollButtons();
    }, 100);

    window.addEventListener('resize', updateScrollButtons);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [finalModsList]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    targetScrollLeftRef.current = element.scrollLeft;

    const animateScroll = () => {
      if (!scrollRef.current) return;
      const current = scrollRef.current.scrollLeft;
      const target = targetScrollLeftRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.5) {
        const step = diff * 0.15;
        const finalStep = Math.abs(step) < 1 ? Math.sign(diff) * 1 : step;

        scrollRef.current.scrollLeft += finalStep;
        if (updateScrollButtonsRef.current) {
          updateScrollButtonsRef.current();
        }
        animationFrameIdRef.current = requestAnimationFrame(animateScroll);
      } else {
        scrollRef.current.scrollLeft = target;
        if (updateScrollButtonsRef.current) {
          updateScrollButtonsRef.current();
        }
        animationFrameIdRef.current = null;
      }
    };

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();

        const maxScroll = element.scrollWidth - element.clientWidth;

        targetScrollLeftRef.current = Math.max(0, Math.min(maxScroll, targetScrollLeftRef.current + e.deltaY * 2.0));

        if (!animationFrameIdRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(animateScroll);
        }
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    updateScrollButtons();

    if (!animationFrameIdRef.current) {
      targetScrollLeftRef.current = scrollRef.current.scrollLeft;
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  const handleModClick = (mod) => {
    if (mod.isMock) {
      setActiveTab('mods');
      return;
    }
    setSearchQuery(mod.name);
    setActiveTab('mods');
  };

  const formatDownloads = (count) => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };



  return (
    <div className="popular-mods-section">
      <div className="popular-mods-header">
        <div className="popular-header-left">
          <h3 className="section-title">
            <Star size={18} fill="var(--primary)" color="var(--primary)" />
            <span>{t('home.popularModsTitle') || 'POPULAR MODS'}</span>
          </h3>
          <p className="section-subtitle">
            {t('home.popularModsSubtitle') || 'Check out the most downloaded mods by the community'}
          </p>
        </div>
        <div className="popular-header-right">
          <div className="carousel-nav-controls">
            <button
              className="carousel-nav-btn left"
              onClick={handleScrollLeft}
              disabled={!canScrollLeft}
              data-tooltip={t('home.scrollLeft') || 'Scroll left'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="carousel-nav-btn right"
              onClick={handleScrollRight}
              disabled={!canScrollRight}
              data-tooltip={t('home.scrollRight') || 'Scroll right'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="view-all-btn" onClick={() => setActiveTab('mods')}>
            {t('home.viewAllMods') || 'View all mods'}
          </button>
        </div>
      </div>

      <div className="popular-carousel-wrapper">
        <div
          className="popular-mods-list"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {finalModsList.map((mod, index) => {
            const cover = getModCategoryCover(mod.category);
            return (
              <div
                key={mod.id}
                className={`popular-mod-card ${index === 0 ? 'active-card' : ''}`}
                onClick={() => handleModClick(mod)}
              >
                <div className="popular-mod-cover-container">
                  <img src={cover} alt={mod.name} className="popular-mod-cover" />
                </div>
                <div className="popular-mod-info">
                  <span className="popular-mod-category">{mod.category}</span>
                  <h4 className="popular-mod-title" data-tooltip={mod.name}>{mod.name}</h4>
                  <div className="popular-mod-meta">
                    <span className="meta-item">
                      <ArrowDown size={12} className="meta-icon" />
                      <span>{formatDownloads(mod.downloads)}</span>
                    </span>
                    <span className="meta-item">
                      <img src={like1Icon} alt="Like" style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                      <span>{mod.likes || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="popular-scroll-indicator">
        <div className="scroll-indicator-fill" style={{ transform: `translateX(${scrollPercent * 2.333}%)` }} />
      </div>
    </div>
  );
};

export default HomePopularMods;
