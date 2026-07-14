import React, { useState, useEffect } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import './ProfileBanner.css';

const ProfileBanner = ({
  isGloballyEditing,
  bannerUrl,
  tempBannerUrl,
  bannerPositionY,
  setBannerPositionY,
  onBannerFileChange,
  onBannerDelete,
  t
}) => {
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPercentY, setDragStartPercentY] = useState(50);

  const displayBannerUrl = tempBannerUrl !== null ? tempBannerUrl : bannerUrl;
  const currentBannerPositionY = isGloballyEditing ? bannerPositionY : (bannerPositionY ?? 50);

  const handleBannerMouseDown = (e) => {
    if (!isGloballyEditing || !displayBannerUrl) return;

    if (
      e.target.closest('.profile-banner-edit-btn') ||
      e.target.closest('.profile-banner-delete-btn') ||
      e.target.closest('input')
    ) {
      return;
    }

    e.preventDefault();
    setIsDraggingBanner(true);
    setDragStartY(e.clientY);
    setDragStartPercentY(bannerPositionY);
  };

  useEffect(() => {
    if (!isDraggingBanner) return;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - dragStartY;
      const deltaPercent = (deltaY / 200) * 100;
      let newPercent = Math.round(dragStartPercentY - deltaPercent);
      newPercent = Math.max(0, Math.min(100, newPercent));
      setBannerPositionY(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingBanner(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBanner, dragStartY, dragStartPercentY, setBannerPositionY]);

  const handleTriggerBannerUpload = () => {
    document.getElementById('banner-upload-input')?.click();
  };

  return (
    <div
      className={`profile-banner glass-panel ${isGloballyEditing && displayBannerUrl ? 'draggable' : ''} ${isGloballyEditing && displayBannerUrl ? (isDraggingBanner ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
      style={{
        backgroundImage: displayBannerUrl ? `url(${displayBannerUrl})` : 'none',
        backgroundPosition: `center ${currentBannerPositionY}%`,
        backgroundSize: 'cover',
      }}
      onMouseDown={handleBannerMouseDown}
    >
      <div className="banner-overlay"></div>
      {isGloballyEditing && (
        <>
          <div className="profile-banner-actions">
            <div className="profile-banner-edit-btn" onClick={handleTriggerBannerUpload}>
              <Camera size={16} />
              <span>{t('profile.changeBanner')}</span>
              <input
                type="file"
                id="banner-upload-input"
                className="file-upload-hidden"
                accept="image/*"
                onChange={onBannerFileChange}
              />
            </div>
            {displayBannerUrl && (
              <div className="profile-banner-delete-btn" onClick={onBannerDelete} data-tooltip={t('profile.deleteBanner')}>
                <Trash2 size={16} />
              </div>
            )}
          </div>
          {displayBannerUrl && (
            <div className="banner-drag-instruction">
              <span>{t('profile.dragInstruction')}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileBanner;
