import React, { useState, useEffect } from 'react';

/**
 * A  settings toggle row with label, description and a switch
 *
 * @param {string}   label     
 * @param {string}   description 
 * @param {boolean}  checked     
 * @param {Function} onChange    
 * @param {boolean}  [disabled]  
 */
const SettingsToggleItem = ({ label, description, checked, onChange, disabled = false }) => {
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounting(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="settings-item">
      <div className="settings-item-info">
        <span className="settings-item-label">{label}</span>
        <span className="settings-item-desc">{description}</span>
      </div>
      <div className="settings-item-control">
        <label className="switch">
          <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
          <span className={`slider ${isMounting ? 'no-transition' : ''}`} />
        </label>
      </div>
    </div>
  );
};

export default SettingsToggleItem;
