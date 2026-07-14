import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const ModTableHeader = ({ onSort, renderSortArrow }) => {
  const { t } = useLanguage();

  return (
    <div className="mod-table-header">
      <div className="col-name sortable" onClick={() => onSort('name')}>
        <span>{t('mods.name')}{renderSortArrow('name')}</span>
      </div>
      <div className="col-action sortable" onClick={() => onSort('status')}>
        <span>{t('mods.action')}{renderSortArrow('status')}</span>
      </div>
      <div className="col-size sortable" onClick={() => onSort('size')}>
        <span>{t('mods.size')}{renderSortArrow('size')}</span>
      </div>
      <div className="col-downloads sortable" onClick={() => onSort('downloads')}>
        <span>{t('mods.downloads')}{renderSortArrow('downloads')}</span>
      </div>
      <div className="col-rating sortable" onClick={() => onSort('likes')}>
        <span>{t('mods.rating')}{renderSortArrow('likes')}</span>
      </div>
      <div className="col-author sortable" onClick={() => onSort('author')}>
        <span>{t('mods.author')}{renderSortArrow('author')}</span>
      </div>
      <div className="col-github sortable" onClick={() => onSort('github')}>
        <span>{t('mods.sourceCode')}{renderSortArrow('github')}</span>
      </div>
      <div className="col-category sortable" onClick={() => onSort('category')}>
        <span>{t('mods.category')}{renderSortArrow('category')}</span>
      </div>
    </div>
  );
};

export default ModTableHeader;
