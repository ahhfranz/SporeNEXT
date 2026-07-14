import React from 'react';
import './Home.css';
import { useGameLauncher } from '../../hooks/useGameLauncher';
import { useModData } from '../ModList/hooks/useModData';
import HomeBanner from './components/HomeBanner';
import HomeNewsSection from './components/HomeNewsSection';
import HomePopularMods from './components/HomePopularMods';
import HomeLiveStatus from './components/HomeLiveStatus';
import HomeUpdaterWidget from './components/HomeUpdaterWidget';

const Home = ({ setActiveTab, setSearchQuery, news = [] }) => {
  const { installedGames, activeLaunch, launchGame, closeGame, detectInstalledGames } = useGameLauncher();
  const { mods, likedMods = {} } = useModData();

  return (
    <div className="home-dashboard animate-tab">
      {/* main content area */}
      <div className="home-main-col">
        <HomeBanner
          installedGames={installedGames}
          activeLaunch={activeLaunch}
          launchGame={launchGame}
          closeGame={closeGame}
          detectInstalledGames={detectInstalledGames}
        />
        <HomeNewsSection news={news} />
        <HomePopularMods
          mods={mods}
          likedMods={likedMods}
          setActiveTab={setActiveTab}
          setSearchQuery={setSearchQuery}
        />
      </div>

      {/* Sidebar (status + updater + recommended mods) */}
      <div className="home-side-col">
        <HomeLiveStatus />
        <HomeUpdaterWidget />
      </div>
    </div>
  );
};

export default Home;
