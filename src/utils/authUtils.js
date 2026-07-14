import { supabase } from '../lib/supabase';

export const preloadImage = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve();
      return;
    }
    const img = new Image();
    img.src = url;
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
};

export async function fetchProfile(uId) {
  try {

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), 30000)
    );

    const fetchPromise = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, description, role, banner_url, banner_position_y, country, last_active_at, username_changed_at, created_at, archetype, archetype_breakdown')
      .eq('id', uId)
      .maybeSingle();

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {

      if (!data.archetype) {
        data.archetype = localStorage.getItem(`sporenext_archetype_${uId}`) || 'Seeker';
      }
      return data;
    }


    if (error && (error.message.includes('archetype') || error.code === 'PGRST204' || error.message.includes('column'))) {
      const fallbackFetchPromise = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, description, role, banner_url, banner_position_y, country, last_active_at, username_changed_at, created_at')
        .eq('id', uId)
        .maybeSingle();

      const { data: fallbackData, error: fallbackError } = await Promise.race([fallbackFetchPromise, timeoutPromise]);

      if (fallbackError) {
        console.error('Error fetching fallback profile:', fallbackError.message);
        return null;
      }

      if (fallbackData) {

        try {
          const { data: archData, error: archError } = await supabase
            .from('profiles')
            .select('archetype')
            .eq('id', uId)
            .maybeSingle();
          if (!archError && archData) {
            fallbackData.archetype = archData.archetype;
          }
        } catch (archErr) {
          console.warn('Could not fetch archetype from Supabase:', archErr);
        }

        try {
          const { data: breakdownData, error: breakdownError } = await supabase
            .from('profiles')
            .select('archetype_breakdown')
            .eq('id', uId)
            .maybeSingle();
          if (!breakdownError && breakdownData) {
            fallbackData.archetype_breakdown = breakdownData.archetype_breakdown;
          }
        } catch (breakdownErr) {
          console.warn('Could not fetch archetype_breakdown from Supabase:', breakdownErr);
        }

        if (!fallbackData.archetype) {
          fallbackData.archetype = localStorage.getItem(`sporenext_archetype_${uId}`) || 'Seeker';
        }
      }
      return fallbackData;
    }

    if (error) {
      console.error('Error fetching profile:', error.message);
    }
    return null;
  } catch (err) {
    console.error('Exception fetching profile:', err.message || err);
    return null;
  }
}

export async function getOrCreateProfile(userId, freshUserObj) {
  let p = await fetchProfile(userId);

  if (!p) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    p = await fetchProfile(userId);
  }

  if (!p) {
    const fallbackProfile = {
      id: userId,
      username: freshUserObj?.user_metadata?.username || freshUserObj?.email?.split('@')[0] || 'user',
      display_name: freshUserObj?.user_metadata?.full_name || freshUserObj?.user_metadata?.name || 'User',
      avatar_url: freshUserObj?.user_metadata?.avatar_url || null,
      role: 'member'
    };

    try {
      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: fallbackProfile.username,
          display_name: fallbackProfile.display_name,
          avatar_url: fallbackProfile.avatar_url,
          role: 'member',
          email: freshUserObj?.email || null
        })
        .select('id, username, display_name, avatar_url, description, role, banner_url, banner_position_y, country, last_active_at, username_changed_at, created_at')
        .maybeSingle();

      if (!insertError && insertedProfile) {
        p = insertedProfile;
      } else {
        p = fallbackProfile;
      }
    } catch (insertErr) {
      console.error('Failed to create missing profile in database:', insertErr);
      p = fallbackProfile;
    }
  }

  if (p) {
    let updatedProfile = p;
    const providerAvatar = freshUserObj?.user_metadata?.avatar_url;
    const currentAvatar = p.avatar_url;
    const isDefaultAvatar = !currentAvatar || currentAvatar.includes('embed/avatars/');
    const hasProviderAvatar = providerAvatar && !providerAvatar.includes('embed/avatars/');

    if (isDefaultAvatar && hasProviderAvatar) {
      try {
        const { data: syncedData, error: syncError } = await supabase
          .from('profiles')
          .update({ avatar_url: providerAvatar })
          .eq('id', userId)
          .select('id, username, display_name, avatar_url, description, role, banner_url, banner_position_y, country, last_active_at, username_changed_at, created_at')
          .single();
        if (!syncError && syncedData) {
          updatedProfile = syncedData;
        }
      } catch (syncErr) {
        console.error('Error syncing provider avatar to profile:', syncErr);
      }
    }
    return updatedProfile;
  }
  return null;
}
