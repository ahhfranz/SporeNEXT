import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import Topbar from './components/Topbar/Topbar'
import MainContent from './components/MainContent/MainContent'
import Login from './components/Login/Login'
import OnboardingModal from './components/OnboardingModal/OnboardingModal'
import NotificationPanel from './components/NotificationPanel/NotificationPanel'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ModDataProvider, ModDataContext } from './context/ModDataContext'
import { AchievementProvider, useAchievements } from './context/AchievementContext'
import { supabase } from './lib/supabase'
import logoIcon from './assets/logo.png'
import WindowControls from './components/WindowControls/WindowControls'
import './App.css'

let globalNewsCache = null;

function AppContent() {
  const { user, loading: isAuthLoading, isOffline } = useAuth();
  const modDataContext = useContext(ModDataContext);
  const isModsLoading = modDataContext ? modDataContext.loading : false;
  const { unlockAchievement } = useAchievements();
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [profileViewTarget, setProfileViewTarget] = useState(null);
  const prevSessionActiveRef = useRef(false);

  const { t } = useLanguage();
  const [news, setNews] = useState(() => globalNewsCache || []);
  const [isNewsLoading, setIsNewsLoading] = useState(() => !globalNewsCache);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isModsLoading) {
      Promise.resolve().then(() => setInitialLoadDone(true));
    }
  }, [isAuthLoading, isModsLoading]);

  // transition from loading screen within 2 seconds max
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadDone(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchNews() {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('id, tag, date, title_en, title_es, description_en, description_es, image_url')
          .order('id', { ascending: false });

        if (!active) return;

        if (error) {
          setNews([]);
          globalNewsCache = [];
        } else if (data && data.length > 0) {
          setNews(data);
          globalNewsCache = data;
        } else {
          setNews([]);
          globalNewsCache = [];
        }
      } catch (err) {
        if (active) {
          setNews([]);
          globalNewsCache = [];
        }
      } finally {
        if (active) setIsNewsLoading(false);
      }
    }

    fetchNews();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (profileViewTarget && (profileViewTarget.username === '42' || profileViewTarget.id === '42')) {
      unlockAchievement('id14');
    }
  }, [profileViewTarget, unlockAchievement]);

  useEffect(() => {
    const isSessionActive = !!user || isOffline;

    if (isSessionActive) {
      if (!prevSessionActiveRef.current) {
        Promise.resolve().then(() => {
          setActiveTab('home');
          setSearchQuery('');
        });

        if (user) {

          const onboardingSeen = localStorage.getItem(`sporenext_onboarding_seen_${user.id}`);
          if (onboardingSeen !== 'true') {
            Promise.resolve().then(() => setShowOnboardingModal(true));
          }
        }
      }
    } else {
      Promise.resolve().then(() => {
        setActiveTab('home');
        setSearchQuery('');
      });
    }
    prevSessionActiveRef.current = isSessionActive;
  }, [user, isOffline]);

  const handleCloseOnboarding = () => {
    if (user) {
      localStorage.setItem(`sporenext_onboarding_seen_${user.id}`, 'true');
    }
    setShowOnboardingModal(false);
  };

  const handleSetActiveTab = (tab, target = null) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      setProfileViewTarget(target);
    } else {
      setProfileViewTarget(null);
    }
    if (tab !== 'mods') {
      setSearchQuery('');
    }
  };

  const isAppLoading = !initialLoadDone;

  if (isAppLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <img src={logoIcon} alt="Loading..." className="spin-icon" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
      </div>
    );
  }

  if (!user && !isOffline) {
    return <Login />;
  }

  return (
    <div className="app-container animate-fade">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
      />

      <NotificationPanel />

      <div className="layout-content">
        <Topbar activeTab={activeTab} setActiveTab={handleSetActiveTab} />
        <MainContent
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          profileViewTarget={profileViewTarget}
          news={news}
        />
      </div>
      <OnboardingModal isOpen={showOnboardingModal} onClose={handleCloseOnboarding} />

      {/* global Window Controls hehe */}
      <WindowControls className="window-controls" />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <ModDataProvider>
            <AchievementProvider>
              <AppContent />
            </AchievementProvider>
          </ModDataProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
