import { supabase } from '../lib/supabase';

let memoryTermsCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

const getStoredTermsCache = () => {
  try {
    const stored = localStorage.getItem('spore_terms_cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.data || null;
    }
  } catch (e) { }
  return null;
};

/**
 * fetches active terms from db with memory + localstorage caching
 * falls back to stored localstorage cache if offline
 * @param {boolean} forceRefresh
 * @returns {Promise<{title_en: string, title_es: string, updated_date_en: string, updated_date_es: string, content_en: string, content_es: string}|null>}
 */
export const fetchTermsFromSupabase = async (forceRefresh = false) => {
  const now = Date.now();

  if (!forceRefresh && memoryTermsCache && (now - lastFetchTime < CACHE_TTL_MS)) {
    return memoryTermsCache;
  }

  if (!forceRefresh) {
    try {
      const stored = localStorage.getItem('spore_terms_cache');
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (data && (now - timestamp < CACHE_TTL_MS)) {
          memoryTermsCache = data;
          lastFetchTime = timestamp;
          return data;
        }
      }
    } catch (e) { }
  }

  try {
    const { data, error } = await supabase
      .from('terms_and_conditions')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !data) {
      return memoryTermsCache || getStoredTermsCache();
    }

    const result = {
      title_en: data.title_en,
      title_es: data.title_es,
      updated_date_en: data.updated_date_en,
      updated_date_es: data.updated_date_es,
      content_en: data.content_en,
      content_es: data.content_es
    };

    memoryTermsCache = result;
    lastFetchTime = now;
    try {
      localStorage.setItem('spore_terms_cache', JSON.stringify({ data: result, timestamp: now }));
    } catch (e) { }

    return result;
  } catch (err) {
    return memoryTermsCache || getStoredTermsCache();
  }
};
