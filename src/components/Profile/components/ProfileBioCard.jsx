import React from 'react';
import { User } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import './ProfileBioCard.css';

const ProfileBioCard = ({ isGloballyEditing, bio, defaultBio, newBio, setNewBio }) => {
  const { t } = useLanguage();

  return (
    <div className="profile-bottom-section">
      <div className="profile-card glass-panel">
        <div className="card-header-row">
          <h2 className="card-title">
            <User size={20} />
            <span>{t('profile.about')}</span>
          </h2>
        </div>
        <div className="card-content">
          {isGloballyEditing ? (
            <div className="edit-bio-container">
              <textarea
                className="edit-bio-textarea"
                value={newBio}
                onChange={e => setNewBio(e.target.value)}
                maxLength={500}
              />
            </div>
          ) : (
            <p className="profile-bio">{bio || defaultBio}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileBioCard;
