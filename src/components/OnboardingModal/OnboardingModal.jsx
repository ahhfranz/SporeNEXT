import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  HelpCircle,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import sporegaIcon from '../../assets/sporega.png';
import { fetchFaqsFromSupabase, LOCAL_FAQ_DATA } from '../../services/faqService';
import { fetchTermsFromSupabase } from '../../services/termsService';
import './OnboardingModal.css';

const OnboardingModal = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('faq');
  const [openFaq, setOpenFaq] = useState({});

  const [faqsData, setFaqsData] = useState([]);
  const [isDynamicFaqs, setIsDynamicFaqs] = useState(false);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(true);

  const [termsData, setTermsData] = useState(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setActiveTab('faq');
      setOpenFaq({});
      setIsLoadingFaqs(true);
      setIsLoadingTerms(true);

      fetchFaqsFromSupabase().then(supabaseData => {
        if (isMounted) {
          if (supabaseData && supabaseData.length > 0) {
            setFaqsData(supabaseData);
            setIsDynamicFaqs(true);
          } else {
            setFaqsData(LOCAL_FAQ_DATA);
            setIsDynamicFaqs(false);
          }
          setIsLoadingFaqs(false);
        }
      });

      fetchTermsFromSupabase().then(terms => {
        if (isMounted) {
          if (terms) {
            setTermsData(terms);
          }
          setIsLoadingTerms(false);
        }
      });
    }
    return () => { isMounted = false; };
  }, [isOpen]);

  const toggleFaq = (key) => {
    setOpenFaq(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderAnswerWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="faq-link"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  const tabsList = [
    { id: 'faq', label: t('onboarding.tabFaq'), icon: HelpCircle },
    { id: 'terms', label: t('onboarding.tabTerms'), icon: ShieldAlert }
  ];

  const handleNext = () => {
    if (activeTab === 'faq') setActiveTab('terms');
    else if (activeTab === 'terms') onClose();
  };

  const handlePrev = () => {
    if (activeTab === 'terms') setActiveTab('faq');
  };

  return createPortal(
    <div className="onboarding-overlay" onClick={onClose}>
      <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="onboarding-header">
          <div className="onboarding-header-left">
            <img src={logoImg} alt="Logo" className="onboarding-header-logo" />
            <div className="onboarding-header-main">
              <h2 className="onboarding-title">{t('onboarding.title')}</h2>
              <p className="onboarding-subtitle">{t('onboarding.subtitle')}</p>
            </div>
          </div>
          <button className="onboarding-close-btn" onClick={onClose} data-tooltip={t('onboarding.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="onboarding-divider" />

        <div className="onboarding-container">
          <div className="onboarding-sidebar">
            {tabsList.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`onboarding-tab-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} className="tab-icon" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="onboarding-content-wrapper">
            <div className="onboarding-content">

              {/* faq tab */}
              {activeTab === 'faq' && (
                <div className="onboarding-pane animate-tab">
                  <h3 className="pane-title">
                    <img src={sporegaIcon} alt="Spore GA" className="pane-title-icon" />
                    {t('onboarding.faqTitle')}
                  </h3>

                  {isLoadingFaqs ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', width: '100%' }}>
                      <img src={logoImg} alt="Loading..." className="spin-icon" style={{ width: '36px', height: '36px', opacity: 0.8 }} />
                    </div>
                  ) : (
                    <div className="faq-list animate-tab">
                      {faqsData.map((cat, catIdx) => {
                        const categoryTitle = isDynamicFaqs
                          ? (language === 'es' ? cat.category_es : cat.category_en)
                          : (cat.categoryKey ? t(cat.categoryKey) : (language === 'es' ? cat.category_es : cat.category_en));

                        return (
                          <React.Fragment key={catIdx}>
                            <div className="faq-section-title">{categoryTitle}</div>
                            {cat.items.map((item) => {
                              const questionText = item.question_en
                                ? (language === 'es' ? item.question_es : item.question_en)
                                : t(item.questionKey);

                              const answerText = item.answer_en
                                ? (language === 'es' ? item.answer_es : item.answer_en)
                                : t(item.answerKey);

                              return (
                                <div key={item.id} className={`faq-item glass ${openFaq[item.id] ? 'open' : ''}`}>
                                  <div className="faq-question" onClick={() => toggleFaq(item.id)}>
                                    <span>{questionText}</span>
                                    {openFaq[item.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </div>
                                  {openFaq[item.id] && (
                                    <div className="faq-answer">
                                      <p>{renderAnswerWithLinks(answerText)}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* terms tab */}
              {activeTab === 'terms' && (
                <div className="onboarding-pane animate-tab">
                  <h3 className="pane-title">
                    <img src={sporegaIcon} alt="Spore GA" className="pane-title-icon" />
                    <span>{language === 'es' ? (termsData?.title_es || t('onboarding.tabTerms')) : (termsData?.title_en || t('onboarding.tabTerms'))}</span>
                    {termsData && (
                      <span className="terms-date-badge">
                        {language === 'es' ? (termsData?.updated_date_es || '') : (termsData?.updated_date_en || '')}
                      </span>
                    )}
                  </h3>
                  <div className="terms-scroll-panel glass">
                    {isLoadingTerms ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', width: '100%' }}>
                        <img src={logoImg} alt="Loading..." className="spin-icon" style={{ width: '36px', height: '36px', opacity: 0.8 }} />
                      </div>
                    ) : (
                      <div
                        className="terms-body animate-tab"
                        dangerouslySetInnerHTML={{
                          __html: language === 'es' ? (termsData?.content_es || '') : (termsData?.content_en || '')
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="onboarding-divider" />

        {/* footer */}
        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {tabsList.map((tab) => (
              <span
                key={tab.id}
                className={`dot ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="onboarding-buttons">
            <button
              className="onboarding-btn prev-btn"
              onClick={handlePrev}
              disabled={activeTab === 'faq'}
            >
              <ArrowLeft size={16} />
              <span>{t('mods.previous')}</span>
            </button>

            <button
              className={`onboarding-btn next-btn ${activeTab === 'terms' ? 'finish-btn' : ''}`}
              onClick={handleNext}
            >
              <span>{activeTab === 'terms' ? t('onboarding.startButton') : t('mods.next')}</span>
              {activeTab !== 'terms' && <ArrowRight size={16} />}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default OnboardingModal;
