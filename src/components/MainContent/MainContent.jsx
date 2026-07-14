import React from 'react';
import { ChevronLeft, Play, Settings } from 'lucide-react';
import './MainContent.css';
import SettingsComponent from '../Settings/Settings';
import ModList from '../ModList/ModList';
import Profile from '../Profile/Profile';
import Home from '../Home/Home';

const MainContent = ({ activeTab, setActiveTab, searchQuery, setSearchQuery, profileViewTarget, news }) => {

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile key="profile" setActiveTab={setActiveTab} profileViewTarget={profileViewTarget} />;
      case 'mods':
        return <ModList key="mods" searchQuery={searchQuery} setSearchQuery={setSearchQuery} setActiveTab={setActiveTab} />;
      case 'settings':
        return <SettingsComponent key="settings" setActiveTab={setActiveTab} />;
      case 'home':
      default:
        return <Home key="home" setActiveTab={setActiveTab} setSearchQuery={setSearchQuery} news={news} />;
    }
  };

  return (
    <main className={`main-content ${activeTab === 'settings' ? 'settings-tab-active' : ''} ${activeTab === 'profile' ? 'profile-tab-active' : ''} ${activeTab === 'mods' ? 'mods-tab-active' : ''} ${activeTab === 'home' ? 'home-tab-active' : ''}`}>
      {renderContent()}
    </main>
  );
};

export default MainContent;
