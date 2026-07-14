import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import './ModList.css';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo.png';
import { useModData } from './hooks/useModData';
import { useModSort } from './hooks/useModSort';
import { useWindowSize } from './hooks/useWindowSize';
import ModToolbar from './components/ModToolbar';
import ModTableHeader from './components/ModTableHeader';
import ModRow from './components/ModRow';
import ModPagination from './components/ModPagination';
import GalaxyResetModal from '../GalaxyResetModal/GalaxyResetModal';
import ModContextMenu from './components/ModContextMenu';
import ModComponentsModal from './components/ModComponentsModal';
import ManualModsModal from '../ManualModsModal/ManualModsModal';

const MODS_PER_PAGE = 10;

const ModList = ({ searchQuery, setSearchQuery, setActiveTab }) => {
  const { t } = useLanguage();
  const tableBodyRef = useRef(null);

  // data and actions
  const {
    mods,
    likedMods,
    downloadProgresses,
    loading,
    loadMods,
    loadModsSilent,
    handleLike,
    handleAction,
    componentsModal
  } = useModData();

  // sorting
  const { handleSort, renderSortArrow, getSortedMods } = useModSort();

  // responsive row limit
  const maxVisibleMods = useWindowSize();

  // search & category filter
  const searchTerm = searchQuery || '';
  const setSearchTerm = setSearchQuery || (() => { });
  const [selectedCategory, setSelectedCategory] = useState('All');

  // pagination
  const [currentPage, setCurrentPage] = useState(1);

  // scroll to top on page change
  useEffect(() => {
    if (tableBodyRef.current) {
      tableBodyRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0 });
  }, [currentPage]);

  // galaxy reset modal
  const [galaxyModalOpen, setGalaxyModalOpen] = useState(false);

  // manual mods modal
  const [manualModsModalOpen, setManualModsModalOpen] = useState(false);

  // local mod components modal (for manual mods installation)
  const [localComponentsModal, setLocalComponentsModal] = useState({
    isOpen: false,
    filePath: null,
    components: [],
    onSuccess: null
  });

  // context Menu
  const [contextMenu, setContextMenu] = useState(null);

  // derived lists
  const filteredMods = mods.filter(mod => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (mod.name || '').toLowerCase().includes(q) ||
      (mod.filename || '').toLowerCase().includes(q) ||
      (mod.author || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedMods = getSortedMods(filteredMods);
  const totalPages = Math.max(1, Math.ceil(sortedMods.length / MODS_PER_PAGE));

  // reset page when filters change
  useEffect(() => {
    Promise.resolve().then(() => setCurrentPage(1));
  }, [searchTerm, selectedCategory]);

  // clamp page if list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      Promise.resolve().then(() => setCurrentPage(totalPages));
    }
  }, [totalPages, currentPage]);

  const currentMods = sortedMods.slice(
    (currentPage - 1) * MODS_PER_PAGE,
    currentPage * MODS_PER_PAGE
  );

  return (
    <div className="mod-list-container">
      <ModToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        loading={loading}
        onReload={() => loadMods(null, true)}
        onGalaxyReset={() => setGalaxyModalOpen(true)}
        onOpenManualMods={() => setManualModsModalOpen(true)}
      />

      <div className={`mod-table ${loading ? 'loading' : ''}`}>
        {loading ? (
          <div className="mods-loading-container">
            <img src={logoImg} alt="Loading..." className="mods-loading-logo" />
            <p>{t('loading')}</p>
          </div>
        ) : (
          <>
            <ModTableHeader onSort={handleSort} renderSortArrow={renderSortArrow} />

            <div ref={tableBodyRef} className={`mod-table-body show-${maxVisibleMods}-mods`}>
              {currentMods.length > 0 ? (
                currentMods.map(mod => (
                  <ModRow
                    key={mod.id}
                    mod={mod}
                    isLiked={!!likedMods[mod.id]}
                    progressInfo={downloadProgresses[mod.id]}
                    onAction={handleAction}
                    onLike={handleLike}
                    setActiveTab={setActiveTab}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        mod: mod
                      });
                    }}
                    isContextMenuOpen={contextMenu?.mod?.id === mod.id}
                  />
                ))
              ) : (
                <div className="no-mods-found">
                  <AlertCircle size={24} />
                  <p>{t('mods.noResults')}</p>
                </div>
              )}
            </div>

            <ModPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalMods={sortedMods.length}
              modsPerPage={MODS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <GalaxyResetModal
        isOpen={galaxyModalOpen}
        onClose={() => setGalaxyModalOpen(false)}
      />

      <ManualModsModal
        isOpen={manualModsModalOpen}
        onClose={() => setManualModsModalOpen(false)}
        dbMods={mods}
        onOpenComponents={(filePath, components, onSuccess) => {
          setLocalComponentsModal({
            isOpen: true,
            filePath,
            components,
            onSuccess
          });
        }}
      />


      {localComponentsModal.isOpen && (
        <ModComponentsModal
          isOpen={localComponentsModal.isOpen}
          mod={{ name: localComponentsModal.filePath ? localComponentsModal.filePath.split(/[/\\]/).pop() : 'Local Mod' }}
          componentsInfo={localComponentsModal.components}
          onClose={() => setLocalComponentsModal({ isOpen: false, filePath: null, components: [], onSuccess: null })}
          onConfirm={async (selectedIndices) => {
            const filePath = localComponentsModal.filePath;
            const onSuccess = localComponentsModal.onSuccess;
            setLocalComponentsModal({ isOpen: false, filePath: null, components: [], onSuccess: null });
            try {
              const res = await window.electronAPI.modInstall(filePath, selectedIndices);
              if (res && res.success) {
                if (onSuccess) onSuccess(res);
              }
            } catch (err) {
              console.error('Failed to install local mod with components:', err);
            }
          }}
        />
      )}

      {contextMenu && (
        <ModContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          mod={contextMenu.mod}
          onClose={() => setContextMenu(null)}
          onAction={handleAction}
          loadModsSilent={loadModsSilent}
        />
      )}

      <ModComponentsModal
        isOpen={componentsModal?.isOpen || false}
        mod={componentsModal?.mod}
        componentsInfo={componentsModal?.componentsInfo}
        onClose={() => {
          if (componentsModal?.resolve) componentsModal.resolve(null);
        }}
        onConfirm={(indices) => {
          if (componentsModal?.resolve) componentsModal.resolve(indices);
        }}
      />
    </div>
  );
};

export default ModList;
