import { useState } from 'react';

const CATEGORY_ORDER = {
  optimization: 1,
  fixes: 2,
  gameplay: 3,
  textures: 4,
  ui: 5,
  editors: 6,
  dependencies: 7
};

function parseSize(sizeStr) {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return num * 1024 * 1024 * 1024;
  if (unit === 'MB') return num * 1024 * 1024;
  if (unit === 'KB') return num * 1024;
  return num;
}

export function useModSort() {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const getSortedMods = (modsList) => {
    const sorted = [...modsList];

    if (sortConfig.key === 'default') {
      return sorted.sort((a, b) => {
        const orderA = CATEGORY_ORDER[(a.category || '').toLowerCase()] ?? 99;
        const orderB = CATEGORY_ORDER[(b.category || '').toLowerCase()] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return sorted.sort((a, b) => {
      let valA, valB;

      switch (sortConfig.key) {
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          break;
        case 'author':
          valA = (a.author || '').toLowerCase();
          valB = (b.author || '').toLowerCase();
          break;
        case 'category':
          valA = (a.category || '').toLowerCase();
          valB = (b.category || '').toLowerCase();
          break;
        case 'size':
          valA = parseSize(a.size);
          valB = parseSize(b.size);
          break;
        case 'likes':
          valA = a.likes || 0;
          valB = b.likes || 0;
          break;
        case 'downloads':
          valA = a.downloads || 0;
          valB = b.downloads || 0;
          break;
        case 'github':
          valA = a.github ? 1 : 0;
          valB = b.github ? 1 : 0;
          break;
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
        default:
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
      }

      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  return { sortConfig, handleSort, renderSortArrow, getSortedMods };
}
