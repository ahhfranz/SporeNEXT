import React, { useState, useEffect } from 'react';
import { Minus, X, Maximize, Minimize2 } from 'lucide-react';

export default function WindowControls({ className = 'window-controls' }) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized);
    }
  }, []);

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.close();
    else window.close();
  };

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize();
      setIsMaximized(prev => !prev);
    }
  };

  return (
    <div className={className}>
      <button className="control-btn" onClick={handleMinimize} data-tooltip="Minimize" data-tooltip-pos="bottom">
        <Minus size={20} />
      </button>
      <button className="control-btn" onClick={handleMaximize} data-tooltip={isMaximized ? 'Restore' : 'Maximize'} data-tooltip-pos="bottom">
        {isMaximized ? <Minimize2 size={16} /> : <Maximize size={16} />}
      </button>
      <button className="control-btn close" onClick={handleClose} data-tooltip="Close" data-tooltip-pos="bottom">
        <X size={20} />
      </button>
    </div>
  );
}
