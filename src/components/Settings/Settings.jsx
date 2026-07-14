import React, { useState } from 'react';
import { User, Sliders, Search, X, Pencil } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useAccountSettings } from './hooks/useAccountSettings';
import AppSettings from './components/AppSettings';
import AccountSettings from './components/AccountSettings';
import './Settings.css';

const Settings = ({ setActiveTab }) => {
  const { t } = useLanguage();
  const { isOffline } = useAuth();
  const accountInfo = useAccountSettings();

  const [activeSection, setActiveSection] = useState('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubItem, setActiveSubItem] = useState('account-info');

  const scrollToSubSection = (sectionId, category) => {
    setActiveSection(category);
    setActiveSubItem(sectionId);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const matchesSearch = (text) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="settings-layout-wrapper animate-tab">
      <aside className="settings-sidebar-panel">

        {/* navigation section categories */}
        <nav className="settings-sidebar-nav">
          {/* account settings header */}
          {matchesSearch(t('settings.accountCategory')) ||
            matchesSearch(t('settings.accountNav')) ||
            matchesSearch(t('settings.accountInfo')) ||
            matchesSearch(t('settings.passwordAndSecurity')) ||
            matchesSearch(t('settings.connectedAccounts')) ||
            matchesSearch(t('settings.deleteAccountTitle')) ? (
            <div className="settings-nav-group">
              <h3 className="settings-nav-header">
                {t('settings.accountCategory')}
              </h3>
              <button
                className={`settings-nav-item ${activeSection === 'account' ? 'active' : ''
                  }`}
                onClick={() => {
                  setActiveSection('account');
                  setActiveSubItem('account-info');
                }}
              >
                <User size={18} />
                <span>{t('settings.accountNav')}</span>
              </button>

              {activeSection === 'account' && (
                <div className="settings-subnav-list">
                  <button
                    className={`settings-subnav-item ${activeSubItem === 'account-info' ? 'active' : ''
                      }`}
                    onClick={() =>
                      scrollToSubSection('account-info', 'account')
                    }
                  >
                    {t('settings.accountInfo')}
                  </button>
                  <button
                    className={`settings-subnav-item ${activeSubItem === 'password-security' ? 'active' : ''
                      }`}
                    onClick={() =>
                      scrollToSubSection('password-security', 'account')
                    }
                  >
                    {t('settings.passwordAndSecurity')}
                  </button>
                  <button
                    className={`settings-subnav-item ${activeSubItem === 'connected-accounts' ? 'active' : ''
                      }`}
                    onClick={() =>
                      scrollToSubSection('connected-accounts', 'account')
                    }
                  >
                    {t('settings.connectedAccounts')}
                  </button>
                  <button
                    className={`settings-subnav-item ${activeSubItem === 'delete-account' ? 'active' : ''
                      }`}
                    onClick={() =>
                      scrollToSubSection('delete-account', 'account')
                    }
                  >
                    {t('settings.deleteAccountTitle')}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <div className="settings-nav-separator" />

          {/* app settings Header */}
          {matchesSearch(t('settings.appCategory')) ||
            matchesSearch(t('settings.appNav')) ||
            matchesSearch(t('settings.preferences')) ||
            matchesSearch(t('settings.cacheTitle')) ? (
            <div className="settings-nav-group">
              <h3 className="settings-nav-header">
                {t('settings.appCategory')}
              </h3>
              <button
                className={`settings-nav-item ${activeSection === 'app' ? 'active' : ''
                  }`}
                onClick={() => {
                  setActiveSection('app');
                  setActiveSubItem('app-preferences');
                }}
              >
                <Sliders size={18} />
                <span>{t('settings.appNav')}</span>
              </button>

              {activeSection === 'app' && (
                <div className="settings-subnav-list">
                  <button
                    className={`settings-subnav-item ${activeSubItem === 'app-preferences' ? 'active' : ''
                      }`}
                    onClick={() =>
                      scrollToSubSection('app-preferences', 'app')
                    }
                  >
                    {t('settings.preferences')}
                  </button>
                  <button
                    className={`settings-subnav-item ${activeSubItem === 'app-cache' ? 'active' : ''
                      }`}
                    onClick={() => scrollToSubSection('app-cache', 'app')}
                  >
                    {t('settings.cacheTitle')}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </nav>
      </aside>

      <main className="settings-main-panel">
        <header className="settings-content-header">
          <h2 className="settings-content-title">
            {activeSection === 'account'
              ? t('settings.accountNav')
              : t('settings.appNav')}
          </h2>
        </header>

        <div className="settings-content-body">
          {activeSection === 'account' ? (
            <AccountSettings accountInfoProp={accountInfo} />
          ) : (
            <AppSettings />
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
