/**
 * @param {Error|any} err - 
 * @param {function} t 
 * @param {string} [fallbackKey] 
 * @returns {string} 
 */
export function getFriendlyErrorMessage(err, t, fallbackKey) {
  if (!err) {
    return fallbackKey ? t(fallbackKey) : t('errors.unknownError');
  }

  const rawMessage = typeof err === 'string' ? err : (err.message || String(err));
  const messageLower = rawMessage.toLowerCase();

  const isNetwork =
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    messageLower.includes('fetch') ||
    messageLower.includes('network') ||
    messageLower.includes('load failed') ||
    messageLower.includes('net::err') ||
    messageLower.includes('connection') ||
    messageLower.includes('aborted') ||
    messageLower.includes('failed to fetch');

  if (isNetwork) {
    const netMsg = t('errors.networkError');
    return `${netMsg} (${rawMessage})`;
  }

  if (fallbackKey) {
    const translatedFallback = t(fallbackKey);
    if (translatedFallback !== fallbackKey) {
      return `${translatedFallback} (${rawMessage})`;
    }
  }

  return rawMessage;
}
