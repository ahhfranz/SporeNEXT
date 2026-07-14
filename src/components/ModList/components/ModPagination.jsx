import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * pagination footter: show "showing X of X mods" and page navigation buttons
 */
const ModPagination = ({ currentPage, totalPages, totalMods, modsPerPage, onPageChange }) => {
  const { t } = useLanguage();

  if (totalMods === 0) return null;

  const start = (currentPage - 1) * modsPerPage + 1;
  const end = Math.min(currentPage * modsPerPage, totalMods);

  const infoText = t('mods.paginationInfo')
    .replace('{start}', start)
    .replace('{end}', end)
    .replace('{total}', totalMods);

  return (
    <div className="mod-table-footer">
      <div className="pagination-info">{infoText}</div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={14} />
            <span>{t('mods.previous')}</span>
          </button>

          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            className="pagination-btn"
            onClick={() => onPageChange(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <span>{t('mods.next')}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ModPagination;
