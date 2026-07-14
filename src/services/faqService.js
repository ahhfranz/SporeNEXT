import { supabase } from '../lib/supabase';

export const LOCAL_FAQ_DATA = [
  {
    categoryKey: 'onboarding.faqModsTitle',
    category_en: 'MOD DOWNLOAD & INSTALLATION',
    category_es: 'DESCARGA E INSTALACIÓN DE MODS',
    items: [
      { id: 'mods1', questionKey: 'onboarding.faqModsQ1', answerKey: 'onboarding.faqModsA1' },
      { id: 'mods2', questionKey: 'onboarding.faqModsQ2', answerKey: 'onboarding.faqModsA2' },
      { id: 'mods3', questionKey: 'onboarding.faqModsQ3', answerKey: 'onboarding.faqModsA3' },
      { id: 'mods4', questionKey: 'onboarding.faqModsQ4', answerKey: 'onboarding.faqModsA4' }
    ]
  },
  {
    categoryKey: 'onboarding.faqProfilesTitle',
    category_en: 'PROFILES',
    category_es: 'PERFILES',
    items: [
      { id: 'profiles1', questionKey: 'onboarding.faqProfilesQ1', answerKey: 'onboarding.faqProfilesA1' },
      { id: 'profiles2', questionKey: 'onboarding.faqProfilesQ2', answerKey: 'onboarding.faqProfilesA2' }
    ]
  },
  {
    categoryKey: 'onboarding.faqAccountTitle',
    category_en: 'ACCOUNT',
    category_es: 'CUENTA',
    items: [
      { id: 'account1', questionKey: 'onboarding.faqAccountQ1', answerKey: 'onboarding.faqAccountA1' },
      { id: 'account2', questionKey: 'onboarding.faqAccountQ2', answerKey: 'onboarding.faqAccountA2' },
      { id: 'account3', questionKey: 'onboarding.faqAccountQ3', answerKey: 'onboarding.faqAccountA3' }
    ]
  },
  {
    categoryKey: 'onboarding.faqDevsTitle',
    category_en: 'DEVELOPERS',
    category_es: 'DESARROLLADORES',
    items: [
      { id: 'devs1', questionKey: 'onboarding.faqDevsQ1', answerKey: 'onboarding.faqDevsA1' },
      { id: 'devs2', questionKey: 'onboarding.faqDevsQ2', answerKey: 'onboarding.faqDevsA2' }
    ]
  }
];

let memoryFaqCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

const getStoredFaqCache = () => {
  try {
    const stored = localStorage.getItem('spore_faq_cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.data || null;
    }
  } catch (e) { }
  return null;
};

/**
 * fetches active faqs from db with memory + localstorage caching
 * falls back to stored localstorage cache if offline
 * @param {boolean} forceRefresh
 * @returns {Promise<Array<{category_en: string, category_es: string, items: Array<{id: string, question_en: string, question_es: string, answer_en: string, answer_es: string}>}>|null>}
 */
export const fetchFaqsFromSupabase = async (forceRefresh = false) => {
  const now = Date.now();

  if (!forceRefresh && memoryFaqCache && (now - lastFetchTime < CACHE_TTL_MS)) {
    return memoryFaqCache;
  }

  if (!forceRefresh) {
    try {
      const stored = localStorage.getItem('spore_faq_cache');
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (data && (now - timestamp < CACHE_TTL_MS)) {
          memoryFaqCache = data;
          lastFetchTime = timestamp;
          return data;
        }
      }
    } catch (e) { }
  }

  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
      return memoryFaqCache || getStoredFaqCache() || LOCAL_FAQ_DATA;
    }

    const categoryMap = new Map();
    data.forEach(item => {
      const catKey = item.category_en || 'GENERAL';
      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, {
          category_en: item.category_en,
          category_es: item.category_es || item.category_en,
          items: []
        });
      }
      categoryMap.get(catKey).items.push({
        id: item.id,
        question_en: item.question_en,
        question_es: item.question_es || item.question_en,
        answer_en: item.answer_en,
        answer_es: item.answer_es || item.answer_en
      });
    });

    const parsedData = Array.from(categoryMap.values());

    memoryFaqCache = parsedData;
    lastFetchTime = now;
    try {
      localStorage.setItem('spore_faq_cache', JSON.stringify({ data: parsedData, timestamp: now }));
    } catch (e) { }

    return parsedData;
  } catch (err) {
    return memoryFaqCache || getStoredFaqCache() || LOCAL_FAQ_DATA;
  }
};
