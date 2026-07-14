import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './LanguageSelect.css';

const languages = [
  { code: 'en', name: 'English, US', nativeName: 'English, US', flag: 'https://flagcdn.com/w40/us.png' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: 'https://flagcdn.com/w40/es.png' }
];

const LanguageSelect = () => {
  const { t, language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="language-setting-section">
      <h3 className="section-title">{t('settings.languageTitle')}</h3>
      <p className="section-desc">{t('settings.languageSub')}</p>
      
      <div className="custom-select-container" ref={dropdownRef}>
        <div 
          className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="trigger-left">
            <img src={selectedLang.flag} alt="flag" className="flag-icon" />
            <span>{selectedLang.nativeName}</span>
          </div>
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {isOpen && (
          <div className="custom-select-dropdown">
            {languages.map(lang => {
              const isSelected = language === lang.code;
              return (
                <div 
                  key={lang.code} 
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(lang.code)}
                >
                  <div className="option-left">
                    <img src={lang.flag} alt="flag" className="flag-icon" />
                    <span className="native-name">{lang.nativeName}</span>
                  </div>
                  <div className="option-right">
                    <span className="english-name">{lang.name}</span>
                    {isSelected && <Check size={18} className="check-icon" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelect;
