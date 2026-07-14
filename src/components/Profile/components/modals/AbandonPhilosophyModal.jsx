import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../../context/LanguageContext';
import logoImg from '../../../../assets/logo.png';
import './AbandonPhilosophyModal.css';

const AbandonPhilosophyModal = ({ isOpen, onClose, onConfirm, currentArchetype }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const translatedArchetypeName = t(`profile.archetypeDetails.${currentArchetype}.name`) || currentArchetype;

  return createPortal(
    <div className="abandon-modal-overlay" onClick={onClose}>
      <div className="abandon-modal" onClick={(e) => e.stopPropagation()}>
        <div className="abandon-modal-content-row">
          <div className="abandon-modal-logo-wrapper">
            <img src={logoImg} alt="Spore NEXT Logo" className="abandon-modal-logo" />
          </div>
          <div className="abandon-modal-details">
            <h2 className="abandon-modal-title">SPORE NEXT</h2>
            <p className="abandon-modal-text">
              {t('profile.abandonPhilosophyConfirm')
                .replace('{archetype}', translatedArchetypeName)}
            </p>
            <div className="abandon-modal-buttons">
              <button className="abandon-modal-btn cancel" onClick={onClose}>
                {t('profile.abandonCancel') || "CANCEL"}
              </button>
              <button className="abandon-modal-btn confirm" onClick={onConfirm}>
                {t('profile.abandonConfirm') || "RESET PHILOSOPHY"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AbandonPhilosophyModal;
