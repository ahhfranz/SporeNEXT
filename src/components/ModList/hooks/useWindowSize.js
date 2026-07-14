import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [maxVisibleMods, setMaxVisibleMods] = useState(6);

  useEffect(() => {
    const handleResize = async () => {
      let isMax = false;
      if (window.electronAPI && window.electronAPI.isMaximized) {
        try {
          isMax = await window.electronAPI.isMaximized();
        } catch (err) {
          console.error('useWindowSize: isMaximized error', err);
        }
      }
      setMaxVisibleMods(isMax || window.innerHeight >= 800 ? 7 : 6);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const id = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(id);
    };
  }, []);

  return maxVisibleMods;
}
