import React, { useState } from 'react';
import { Home, Settings, LogOut, User, HelpCircle, Coffee } from 'lucide-react';
import './Sidebar.css';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import logoImg from '../../assets/logo.png';
import modsIcon from '../../assets/mods1.png';
import LogoutModal from '../LogoutModal/LogoutModal';

const Sidebar = ({ activeTab, setActiveTab, onOpenOnboarding }) => {
  const { t } = useLanguage();
  const { logout, isOffline } = useAuth();
  const { unreadCount, isOpen, setIsOpen } = useNotification();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-logo" onClick={() => setIsOpen(!isOpen)} data-tooltip={t('notifications.title') || "Notifications"} data-tooltip-pos="right">
          <div className="logo-wrapper">
            <img src={logoImg} alt="Logo" className="logo-img" />
            {unreadCount > 0 && (
              <span className="logo-badge">{unreadCount}</span>
            )}
          </div>
        </div>

        <div className="sidebar-group">
          <div
            className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''} ${isOffline ? 'disabled' : ''}`}
            data-tooltip={isOffline ? t('sidebar.profileDisabled') : t('sidebar.profile')}
            data-tooltip-pos="right"
            onClick={() => { if (!isOffline) setActiveTab('profile'); }}
          >
            <User size={22} className="icon" />
          </div>
        </div>

        <div className="sidebar-main-nav glass">
          <div className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`} data-tooltip={t('sidebar.home')} data-tooltip-pos="right" onClick={() => setActiveTab('home')}>
            <Home size={22} className="icon" />
          </div>
          <div className={`sidebar-item ${activeTab === 'mods' ? 'active' : ''}`} data-tooltip={t('sidebar.mods')} data-tooltip-pos="right" onClick={() => setActiveTab('mods')}>
            <img src={modsIcon} alt="Mods" className="icon" style={{ width: '25px', height: '25px', objectFit: 'contain' }} />
          </div>
          <div className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`} data-tooltip={t('sidebar.settings')} data-tooltip-pos="right" onClick={() => setActiveTab('settings')}>
            <Settings size={22} className="icon" />
          </div>
        </div>

        <div className="sidebar-bottom">
          <a
            href="https://buymeacoffee.com/sporenext"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-item coffee"
            data-tooltip={t('sidebar.coffee') || "Buy Me a Coffee"}
            data-tooltip-pos="right"
            style={{ marginBottom: '10px' }}
          >
            <Coffee size={22} className="icon" />
          </a>
          <a
            href="https://discord.com/invite/JqZyyugs5a"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-item discord"
            data-tooltip="Discord"
            data-tooltip-pos="right"
            style={{ marginBottom: '10px' }}
          >
            <svg className="icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0314a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
          </a>
          <div className="sidebar-item help" data-tooltip={t('onboarding.helpTooltip')} data-tooltip-pos="right" onClick={onOpenOnboarding} style={{ marginBottom: '10px' }}>
            <HelpCircle size={22} className="icon" />
          </div>
          <div className="sidebar-item logout" data-tooltip={t('sidebar.logout')} data-tooltip-pos="right" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={22} className="icon" />
          </div>
        </div>
      </nav>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />
    </>
  );
};

export default Sidebar;
