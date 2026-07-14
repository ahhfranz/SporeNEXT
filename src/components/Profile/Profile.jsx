import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './Profile.css';
import logoImg from '../../assets/logo.png';

import ProfileBanner from './components/ProfileBanner';
import ProfileAvatar from './components/ProfileAvatar';
import ProfileSearch from './components/ProfileSearch';
import ProfileDetails from './components/ProfileDetails';
import ProfileActions from './components/ProfileActions';
import ProfileBioCard from './components/ProfileBioCard';
import ProfileAchievements from './components/ProfileAchievements';
import { useAchievements } from '../../context/AchievementContext';
import { useProfileEdit } from './hooks/useProfileEdit';
import { useProfileData } from './hooks/useProfileData';

const Profile = ({ setActiveTab, profileViewTarget }) => {
  const { user, profile, fetchProfile, refreshProfile, isOffline, updateProfile, isNetworkOnline } = useAuth();
  const { fetchOwnAchievements, unlockAchievement, fetchOtherUserAchievements } = useAchievements();
  const { t } = useLanguage();

  const {
    setSelectedProfile,
    selectedAchievements,
    isLoadingOtherProfile,
    isBannerImageLoading,
    isViewingOthers,
    activeProfile,
    isOnline,
    connectedProviders,
    displayName,
    avatarUrl,
    bannerUrl,
    handleRefresh,
    handleSelectProfile
  } = useProfileData({
    user,
    profile,
    isOffline,
    isNetworkOnline,
    fetchProfile,
    fetchOwnAchievements,
    fetchOtherUserAchievements,
    refreshProfile,
    profileViewTarget,
    t
  });

  const handleArchetypeChange = async (newArchetype, results = null) => {
    try {
      await updateProfile({ archetype: newArchetype, archetype_breakdown: results });
    } catch (err) {
      console.error("Failed to update archetype:", err);
    }
  };

  const role = activeProfile?.role || 'member';

  useEffect(() => {
    refreshProfile?.();
  }, [user?.id]);

  // easter egg: "42" shhhhh! 
  useEffect(() => {
    if (activeProfile && (activeProfile.username === '42' || activeProfile.id === '42')) {
      unlockAchievement?.('id14');
    }
  }, [activeProfile, unlockAchievement]);

  const edit = useProfileEdit({ activeProfile, displayName, role, bannerUrl });

  const displayAvatarUrl = edit.tempAvatarUrl || avatarUrl;

  return (
    <>
      <ProfileSearch onSelectUser={handleSelectProfile} t={t} onRefresh={handleRefresh} isRefreshing={isLoadingOtherProfile} />

      <div className="profile-container animate-tab">
        {(isLoadingOtherProfile || isBannerImageLoading) ? (
          <div className="profile-loading-container">
            <img src={logoImg} alt="Loading..." className="profile-loading-logo" />
          </div>
        ) : (
          <>
            {/* Top Hero Banner Card */}
            <div className="profile-hero-card">
              <ProfileBanner
                isGloballyEditing={edit.isGloballyEditing}
                bannerUrl={bannerUrl}
                tempBannerUrl={edit.tempBannerUrl}
                bannerPositionY={edit.bannerPositionY}
                setBannerPositionY={edit.setBannerPositionY}
                onBannerFileChange={edit.handleBannerFileChange}
                onBannerDelete={() => edit.setTempBannerUrl('')}
                t={t}
              />

              <div className="profile-banner-content">
                <div className="profile-hero-left">
                  <ProfileAvatar
                    isGloballyEditing={edit.isGloballyEditing}
                    displayAvatarUrl={displayAvatarUrl}
                    onAvatarFileChange={edit.handleAvatarFileChange}
                    isOnline={isOnline}
                    archetype={activeProfile?.archetype || 'Seeker'}
                    archetypeBreakdown={activeProfile?.archetype_breakdown}
                    isViewingOthers={isViewingOthers}
                    onArchetypeChange={handleArchetypeChange}
                  />

                  <ProfileDetails
                    displayName={displayName}
                    role={role}
                    activeProfile={activeProfile}
                    isViewingOthers={isViewingOthers}
                    isGloballyEditing={edit.isGloballyEditing}
                    newDisplayName={edit.newDisplayName}
                    setNewDisplayName={edit.setNewDisplayName}
                    newUsername={edit.newUsername}
                    setNewUsername={edit.setNewUsername}
                    countryCode={edit.countryCode}
                    setCountryCode={edit.setCountryCode}
                    cooldownSeconds={edit.cooldownSeconds}
                    formatCooldown={edit.formatCooldown}
                    errorMsg={edit.errorMsg}
                    user={user}
                    connectedProviders={connectedProviders}
                  />
                </div>

                <div className="profile-hero-right">
                  <ProfileActions
                    isViewingOthers={isViewingOthers}
                    isGloballyEditing={edit.isGloballyEditing}
                    isSaving={edit.isSaving}
                    onBack={() => setSelectedProfile(null)}
                    onCancel={edit.handleCancelEdit}
                    onSave={edit.handleSaveAll}
                    onStartEdit={edit.handleStartEdit}
                    onGoToSettings={() => setActiveTab('settings')}
                  />
                </div>
              </div>
            </div>

            {/* Grid Layout: Left Column (About Me) | Right Column (Achievements) */}
            <div className="profile-grid-container">
              <div className="profile-main-column">
                <ProfileBioCard
                  isGloballyEditing={edit.isGloballyEditing}
                  bio={activeProfile?.description}
                  defaultBio=""
                  newBio={edit.newBio}
                  setNewBio={edit.setNewBio}
                />
              </div>

              <div className="profile-sidebar-column">
                <ProfileAchievements
                  profile={activeProfile}
                  isViewingOthers={isViewingOthers}
                  achievementsData={isViewingOthers ? selectedAchievements : undefined}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Profile;
