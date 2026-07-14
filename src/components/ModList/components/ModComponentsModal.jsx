import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import './ModComponentsModal.css';
import logoRefresh from '../../../assets/logo_refresh.png';

const ModComponentsModal = ({ isOpen, mod, componentsInfo, onClose, onConfirm }) => {
  const { t } = useLanguage();
  const [selections, setSelections] = useState({});
  const [activeComp, setActiveComp] = useState(null);

  useEffect(() => {
    if (componentsInfo?.groups) {
      const initialSelections = {};
      let firstComp = null;

      componentsInfo.groups.forEach(group => {
        if (group.type === 'group') {
          const defaultComp = group.components.find(c => c.defaultChecked) || group.components[0];
          if (defaultComp) {
            const idx = group.components.indexOf(defaultComp);
            initialSelections[group.unique] = idx;
            if (!firstComp) firstComp = defaultComp;
          }
        } else {
          const comp = group.components[0];
          initialSelections[group.unique] = comp.defaultChecked ? 0 : -1;
          if (!firstComp) firstComp = comp;
        }
      });

      Promise.resolve().then(() => {
        setSelections(initialSelections);
        setActiveComp(firstComp);
      });
    }
  }, [componentsInfo]);

  if (!isOpen || !componentsInfo || !mod) return null;

  const handleSelect = (groupUnique, componentIndex) => {
    setSelections(prev => ({
      ...prev,
      [groupUnique]: componentIndex
    }));
  };

  const handleToggleCheckbox = (groupUnique) => {
    setSelections(prev => ({
      ...prev,
      [groupUnique]: prev[groupUnique] === 0 ? -1 : 0
    }));
  };

  const handleConfirm = () => {
    const selectedIndices = componentsInfo.groups.map(group => {
      if (group.type === 'group') {
        return selections[group.unique] ?? 0;
      } else {
        return selections[group.unique] === 0 ? 'y' : 'n';
      }
    });
    onConfirm(selectedIndices);
  };

  return createPortal(
    <div className="mod-comp-modal-overlay" onClick={onClose}>
      <div className="mod-comp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mod-comp-header">
          <h3>{t('mods.installerTitle') || 'Mod Options'}</h3>
          <span className="mod-comp-mod-name">{mod.name}</span>
        </div>

        <p className="mod-comp-sub">{t('mods.installerSub') || 'Configure the features and modes you want to install for this mod.'}</p>

        <div className="mod-comp-modal-body">
          <div className="mod-comp-left">
            {componentsInfo.groups.map(group => {
              if (group.type === 'group') {
                return (
                  <div key={group.unique} className="mod-comp-group-card">
                    <h4 className="mod-comp-group-title">{group.displayName || 'Option'}</h4>
                    <div className="mod-comp-options-list">
                      {group.components.map((comp, idx) => {
                        const isSelected = selections[group.unique] === idx;
                        const isFocused = activeComp?.unique === comp.unique;
                        return (
                          <div
                            key={comp.unique || idx}
                            className={`mod-comp-option-card ${isSelected ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                            onClick={() => {
                              handleSelect(group.unique, idx);
                              setActiveComp(comp);
                            }}
                            onMouseEnter={() => setActiveComp(comp)}
                          >
                            <div className="mod-comp-option-details">
                              <span className="mod-comp-option-name">{comp.displayName}</span>
                            </div>

                            <div className="mod-comp-radio-wrapper">
                              <div className={`mod-comp-radio-circle ${isSelected ? 'checked' : ''}`}>
                                {isSelected && <div className="mod-comp-radio-inner" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {

                const comp = group.components[0];
                const isSelected = selections[group.unique] === 0;
                const isFocused = activeComp?.unique === comp.unique;
                return (
                  <div key={group.unique} className="mod-comp-standalone-wrapper">
                    <div
                      className={`mod-comp-option-card standalone ${isSelected ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                      onClick={() => {
                        handleToggleCheckbox(group.unique);
                        setActiveComp(comp);
                      }}
                      onMouseEnter={() => setActiveComp(comp)}
                    >
                      <div className="mod-comp-option-details">
                        <span className="mod-comp-option-name">{comp.displayName}</span>
                      </div>

                      <div className="mod-comp-checkbox-wrapper">
                        <div className={`mod-comp-checkbox-box ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={12} strokeWidth={3.5} style={{ color: 'var(--bg-card, #10121a)' }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          <div className="mod-comp-right">
            {activeComp ? (
              <div className="mod-comp-preview-content">
                <h4 className="mod-comp-preview-title">{activeComp.displayName}</h4>

                <div className="mod-comp-preview-image-container">
                  {activeComp.image ? (
                    <img
                      src={activeComp.image}
                      alt={activeComp.displayName}
                      className="mod-comp-preview-image"
                    />
                  ) : (
                    <div className="mod-comp-preview-placeholder">
                      <span>{t('mods.installerNoPreview')}</span>
                    </div>
                  )}
                </div>

                {activeComp.description ? (
                  <div className="mod-comp-preview-description">
                    {activeComp.description.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="mod-comp-preview-description-empty">
                    {t('mods.installerNoDescription')}
                  </div>
                )}
              </div>
            ) : (
              <div className="mod-comp-preview-empty">
                <span>{t('mods.installerSelectPrompt')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mod-comp-buttons">
          <button className="mod-comp-btn cancel" onClick={onClose}>
            {t('login.cancel') || 'Cancel'}
          </button>
          <button className="mod-comp-btn confirm" onClick={handleConfirm}>
            <img src={logoRefresh} alt="Install" className="mod-comp-btn-icon" />
            {t('mods.installerConfirm') || 'Confirm & Install'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModComponentsModal;
