import { supabase } from '../../../lib/supabase';

/**
 * formats a date string into a localised short date, ejm:  "5 Jun 2026".
@param {string} dateString  
@param {'en'|'es'} lang  
@returns {string}
 */
export const formatDate = (dateString, lang = 'en') => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  const day = date.getDate();
  const year = date.getFullYear();

  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const month = (lang === 'es' ? monthsEs : monthsEn)[date.getMonth()];
  const monthStr = month.charAt(0).toUpperCase() + month.slice(1);
  return `${day} ${monthStr} ${year}`;
};

/**
 * formats a date string into relative time considering strictly hours and days (or "Now" / "Ahora").
 * @param {string} dateString
 * @param {'en'|'es'} lang
 * @returns {string}
 */
export const formatLastOnline = (dateString, lang = 'en') => {
  if (!dateString) {
    return lang === 'es' ? 'Ahora' : 'Now';
  }

  const date = new Date(dateString);
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    if (lang === 'es') {
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    }
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  if (diffHours >= 1) {
    if (lang === 'es') {
      return `hace ${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'}`;
    }
    return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
  }

  return lang === 'es' ? 'Ahora' : 'Now';
};

/**
 * compresses an image file to a Base-64 JPEG data url
 * @param {File}   file
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @param {number} quality  
 * @returns {Promise<string>}
 */
export const compressImage = (file, maxWidth, maxHeight, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

/**.
 * @param {string} userId
 * @param {'avatar' | 'banner'} type
 * @param {string} base64Data
 * @returns {Promise<string>} the public url of the uploaded image, or the fallback base64 string
 */
export const uploadProfileImage = async (userId, type, base64Data) => {
  if (!base64Data || !base64Data.startsWith('data:')) {
    return base64Data; // already a url or empty
  }

  try {
    const parts = base64Data.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });

    // determine file path (ej: avatars/{userId}.jpg or banners/{userId}.jpg)
    const folder = type === 'avatar' ? 'avatars' : 'banners';
    const filePath = `${folder}/${userId}.jpg`;

    const { error } = await supabase.storage
      .from('profiles')
      .upload(filePath, blob, {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (error) {
      return base64Data;
    }

    // get the public url
    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    // append a timestamp to prevent browser image caching issues when updated
    return `${publicUrl}?t=${Date.now()}`;
  } catch (err) {
    return base64Data;
  }
};
