import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { COUNTRIES_LIST } from './countries';
import './CountrySelect.css';

const CountrySelect = ({
  isGloballyEditing,
  countryCode,
  setCountryCode,
  language,
  t
}) => {
  const dropdownRef = useRef(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // filtered and sorted countries list based on search query and lang
  const filteredCountries = COUNTRIES_LIST.filter(c => {
    const name = language === 'es' ? c.es : c.en;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    const nameA = language === 'es' ? a.es : a.en;
    const nameB = language === 'es' ? b.es : b.en;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="profile-metadata-item">
      <MapPin size={14} />
      {isGloballyEditing ? (
        <div className="edit-country-wrapper" ref={dropdownRef}>
          <div
            className="custom-country-trigger"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
          >
            <span>
              {countryCode ? (
                (() => {
                  const selected = COUNTRIES_LIST.find(c => c.code === countryCode);
                  return selected ? (language === 'es' ? selected.es : selected.en) : t('profile.noCountry');
                })()
              ) : t('profile.noCountry')}
            </span>
            <ChevronDown size={14} />
          </div>

          {isCountryDropdownOpen && (
            <div className="custom-country-panel glass">
              <input
                type="text"
                className="custom-country-search"
                placeholder={language === 'es' ? 'Buscar país...' : 'Search country...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="custom-country-options country-dropdown-list">
                <div
                  className="custom-country-option"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCountryCode('');
                    setIsCountryDropdownOpen(false);
                    setSearchQuery('');
                  }}
                >
                  {t('profile.noCountry')}
                </div>
                {filteredCountries.map((c) => (
                  <div
                    key={c.code}
                    className={`custom-country-option ${c.code === countryCode ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCountryCode(c.code);
                      setIsCountryDropdownOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <span>{language === 'es' ? c.es : c.en}</span>
                    {c.code === countryCode && <Check size={12} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {countryCode && (
            <img
              src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
              className="profile-flag-icon"
              alt="Flag"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>
      ) : (
        <span>
          {(() => {
            const selected = COUNTRIES_LIST.find(c => c.code === countryCode);
            if (selected) {
              return (
                <>
                  <span className="metadata-value">
                    {language === 'es' ? selected.es : selected.en}
                  </span>
                  <img
                    src={`https://flagcdn.com/w40/${selected.code.toLowerCase()}.png`}
                    className="profile-flag-icon"
                    alt={language === 'es' ? selected.es : selected.en}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </>
              );
            }
            return <span className="metadata-value">{t('profile.noCountry')}</span>;
          })()}
        </span>
      )}
    </div>
  );
};

export default CountrySelect;
