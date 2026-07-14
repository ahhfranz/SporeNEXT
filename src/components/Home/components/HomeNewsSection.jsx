import React, { useState } from 'react';
import { Radio, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const HomeNewsSection = ({ news = [] }) => {
  const { t, language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const fallbackNews = [
    {
      id: 'news1',
      tag: 'update',
      date: '2026-07-07T12:00:00.000Z',
      title_en: 'Spore NEXT v2.0.0 is now live!',
      title_es: '¡Spore NEXT v2.0.0 ya está disponible!',
      description_en: "After a ton of work behind the scenes, it's finally here. I'm super excited to drop this big update for you all. Hope you enjoy it!",
      description_es: 'Después de mucho trabajo detrás de escena, finalmente está aquí. Estoy súper emocionado de lanzar esta gran actualización para todos. ¡Espero que la disfruten!'
    },
    {
      id: 'news2',
      tag: 'patch',
      date: '2026-07-10T12:00:00.000Z',
      title_en: 'Stability Patch v2.0.3 released',
      title_es: 'Lanzamiento del parche de estabilidad v2.0.3',
      description_en: 'Fixed minor bugs in the game detection algorithm and improved download speeds for high-volume mods.',
      description_es: 'Se corrigieron errores menores en el algoritmo de detección del juego y se mejoraron las velocidades de descarga.'
    }
  ];

  const finalNewsList = news && news.length > 0 ? news : fallbackNews;
  const currentNews = finalNewsList[activeIndex] || finalNewsList[0];

  const getNewsField = (item, field) => {
    if (!item) return '';
    const isSpanish = language === 'es';
    if (field === 'title') {
      return isSpanish ? item.title_es || item.title_en : item.title_en || item.title_es;
    }
    if (field === 'description') {
      return isSpanish ? item.description_es || item.description_en : item.description_en || item.description_es;
    }
    return '';
  };

  const getTagLabel = (tag) => {
    if (!tag) return '';
    if (tag === 'update') return t('home.tagUpdate') || 'Update';
    if (tag === 'patch') return t('home.tagPatch') || 'Patch';
    if (tag === 'community') return t('home.tagCommunity') || 'Community';
    return tag.toUpperCase();
  };

  const formatNewsDate = (dateStr) => {
    if (!dateStr) return '';
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return dateStr;
  };

  return (
    <div className="news-section-new">
      <div className="news-header-row-new">
        <h3 className="section-title">
          <Radio size={18} color="var(--primary)" />
          <span>{t('home.newsTitle') || 'NEWS & UPDATES'}</span>
        </h3>
      </div>

      {currentNews && (
        <div className="news-big-card">
          <div
            className="news-image-column"
            style={
              (currentNews.image_url || currentNews.image)
                ? {
                  backgroundImage: `url(${currentNews.image_url || currentNews.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
                : {}
            }
          >
          </div>

          <div className="news-content-column">
            <div className="news-content-meta">
              <span className={`news-tag-badge ${currentNews.tag}`}>
                {getTagLabel(currentNews.tag)}
              </span>
              <span className="news-date-text">
                {formatNewsDate(currentNews.date)}
              </span>
            </div>

            <h4 className="news-title-new">{getNewsField(currentNews, 'title')}</h4>
            <p className="news-description-new">{getNewsField(currentNews, 'description')}</p>

            <div className="news-slider-footer">
              <div className="news-dots-container">
                {finalNewsList.map((_, index) => (
                  <button
                    key={index}
                    className={`news-dot ${activeIndex === index ? 'active' : ''}`}
                    onClick={() => setActiveIndex(index)}
                    data-tooltip={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <ChevronRight size={18} className="news-chevron-icon" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeNewsSection;
