import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../../context/LanguageContext';
import { useAuth } from '../../../../context/AuthContext';
import { ArrowLeft, RefreshCw, X } from 'lucide-react';
import { questions } from '../../data/questionsData';
import './ArchetypeTestModal.css';

// import icons
import LogoIcon from '../../../../assets/logo.png';
import SeekerIcon from '../../../../assets/archetypes/Seeker.png';
import WandererIcon from '../../../../assets/archetypes/Wanderer.png';
import BardIcon from '../../../../assets/archetypes/Bard.png';
import DiplomatIcon from '../../../../assets/archetypes/Diplomat.png';
import EcologistIcon from '../../../../assets/archetypes/Ecologist.png';
import KnightIcon from '../../../../assets/archetypes/Knight.png';
import ScientistIcon from '../../../../assets/archetypes/Scientist.png';
import ShamanIcon from '../../../../assets/archetypes/Shaman.png';
import TraderIcon from '../../../../assets/archetypes/Trader.png';
import WarriorIcon from '../../../../assets/archetypes/Warrior.png';
import ZealotIcon from '../../../../assets/archetypes/Zealot.png';

const archetypeIcons = {
  Seeker: SeekerIcon,
  Wanderer: WandererIcon,
  Bard: BardIcon,
  Diplomat: DiplomatIcon,
  Ecologist: EcologistIcon,
  Knight: KnightIcon,
  Scientist: ScientistIcon,
  Shaman: ShamanIcon,
  Trader: TraderIcon,
  Warrior: WarriorIcon,
  Zealot: ZealotIcon
};

const archetypeColors = {
  Seeker: '#97989b',
  Wanderer: '#57606f',
  Bard: '#47ba8a',
  Diplomat: '#cace47',
  Ecologist: '#a6d145',
  Knight: '#d3459a',
  Scientist: '#4e45c9',
  Shaman: '#4ff761',
  Trader: '#4bbfdc',
  Warrior: '#da3f13',
  Zealot: '#ad48d6'
};

const ArchetypeTestModal = ({ isOpen, onClose, onSelectArchetype }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState([]);
  const [recommended, setRecommended] = useState(null);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        setCurrentIdx(0);
        setAnswers([]);
        setFinished(false);
        setResults([]);
        setRecommended(null);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAnswer = (archetype) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentIdx] = archetype;
    setAnswers(updatedAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      calculateResults(updatedAnswers);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const calculateResults = (finalAnswers) => {
    const counts = {};

    Object.keys(archetypeColors).forEach(name => {
      counts[name] = 0;
    });

    finalAnswers.forEach(arch => {
      if (counts[arch] !== undefined) {
        counts[arch]++;
      }
    });

    const total = finalAnswers.length;
    const computedResults = Object.entries(counts)
      .map(([name, count]) => {
        const percentage = Math.round((count / total) * 100);
        return {
          name,
          percentage,
          color: archetypeColors[name]
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const top = computedResults[0];
    setResults(computedResults);
    setRecommended(top.name);
    setFinished(true);
  };

  const handleRepeat = () => {
    setCurrentIdx(0);
    setAnswers([]);
    setFinished(false);
    setResults([]);
    setRecommended(null);
  };

  const handleConfirm = () => {
    if (onSelectArchetype && recommended) {
      const userId = user?.id || 'nomad';
      localStorage.setItem(`sporenext_archetype_results_${userId}`, JSON.stringify(results));
      onSelectArchetype(recommended, results);
    }
    onClose();
  };

  const lang = language === 'es' ? 'es' : 'en';
  const currentQ = questions[currentIdx];

  const getTranslatedArchetype = (key) => {
    return t(`profile.archetypeDetails.${key}.name`) || key;
  };

  return createPortal(
    <div className="archetype-test-overlay" onClick={onClose}>
      <div className="archetype-test-modal glass" onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="archetype-test-header">
          <div className="archetype-test-title-group">
            <h2 className="archetype-test-title">
              {finished
                ? (t('profile.testFinished') || "Philosophy Alignment")
                : (t('profile.testTitle') || "Spore Archetype Assessment")}
            </h2>
            <p className="archetype-test-subtitle">
              {finished
                ? (t('profile.testFinishedSub') || "The galaxy has analyzed your answers.")
                : (t('profile.testSubtitle') || "Answer the questions to find your evolutionary path.")}
            </p>
          </div>
          <button className="archetype-test-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="archetype-test-divider" />

        {/* content pane */}
        <div className="archetype-test-content-container">
          {!finished ? (
            <div className="archetype-test-quiz-pane animate-tab">

              {/* progress and back */}
              <div className="quiz-navigation-header">
                <button
                  className="quiz-back-btn"
                  onClick={handleBack}
                  disabled={currentIdx === 0}
                >
                  <ArrowLeft size={16} />
                  <span>{t('mods.previous') || "Back"}</span>
                </button>
                <div className="quiz-progress-text">
                  {(t('profile.questionProgress') || "Question {curr} of {total}")
                    .replace('{curr}', currentIdx + 1)
                    .replace('{total}', questions.length)}
                </div>
              </div>

              {/* progressbar */}
              <div className="quiz-progress-bar-wrapper">
                <div
                  className="quiz-progress-bar-fill"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* question text */}
              <h3 className="quiz-question-text">
                {currentQ.question[lang]}
              </h3>

              {/* answers */}
              <div className="quiz-answers-list">
                {currentQ.answers.map((answer, index) => {
                  const color = archetypeColors[answer.archetype];
                  return (
                    <button
                      key={index}
                      className="quiz-answer-option"
                      onClick={() => handleSelectAnswer(answer.archetype)}
                      style={{ '--option-color': color }}
                    >
                      <div className="quiz-option-bullet" />
                      <span className="quiz-option-text">{answer.text[lang]}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="archetype-test-results-pane animate-tab">
              <div className="results-hero-card">
                <div className="results-avatar-wrapper" style={{ borderColor: archetypeColors[recommended] }}>
                  <img
                    src={archetypeIcons[recommended]}
                    alt={recommended}
                    className="results-archetype-icon"
                  />
                </div>
                <div className="results-hero-info">
                  <span className="results-compatibility-label">
                    {t('profile.compatibilityLabel') || "Compatible Philosophy Found:"}
                  </span>
                  <h3 className="results-archetype-name" style={{ color: archetypeColors[recommended] }}>
                    {getTranslatedArchetype(recommended)}
                  </h3>
                  <p className="results-archetype-desc">
                    {t(`profile.archetypeDetails.${recommended}.desc`)}
                  </p>
                </div>
              </div>

              {/* percents */}
              <h4 className="results-breakdown-title">
                {t('profile.resultsBreakdown') || "Alignment Breakdown"}
              </h4>
              <div className="results-breakdown-grid">
                {results.filter(r => r.percentage > 0).map((res) => (
                  <div key={res.name} className="breakdown-item">
                    <div className="breakdown-info">
                      <span className="breakdown-name">{getTranslatedArchetype(res.name)}</span>
                      <span className="breakdown-pct">{res.percentage}%</span>
                    </div>
                    <div className="breakdown-bar-bg">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${res.percentage}%`, backgroundColor: res.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* action buttons */}
              <div className="results-actions">
                <button className="results-btn repeat" onClick={handleRepeat}>
                  <RefreshCw size={16} />
                  <span>{t('profile.repeatTest') || "Repeat Test"}</span>
                </button>
                <button className="results-btn confirm" onClick={handleConfirm}>
                  <img src={LogoIcon} alt="Logo" className="results-confirm-icon" />
                  <span>{t('profile.acceptPhilosophy') || "Follow Philosophy"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ArchetypeTestModal;
