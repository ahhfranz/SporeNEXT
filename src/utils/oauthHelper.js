import { supabase } from '../lib/supabase';
import { getRedirectUrl } from './urlHelper';
import { getFriendlyErrorMessage } from './errorHelper';

export async function linkOAuthProvider({
  provider,
  scopes,
  refreshUser,
  refreshProfile,
  t,
  onStart,
  onSuccess,
  onFailure,
  onFinalize
}) {
  onStart();
  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        scopes,
        redirectTo: getRedirectUrl(provider),
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const popup = window.open(data.url, `Link ${provider.charAt(0).toUpperCase() + provider.slice(1)}`, 'width=600,height=800');
      if (popup) {
        const checkClosed = setInterval(async () => {
          if (popup.closed) {
            clearInterval(checkClosed);
            const updatedUser = await refreshUser();
            if (updatedUser) {
              await refreshProfile();
            } else {
              console.error('Error fetching updated user');
            }
            onSuccess();
          }
        }, 1000);
      } else {
        onFinalize();
        if (!window.electronAPI) {
          console.warn('Popup window blocked.');
        }
      }
    } else {
      onFinalize();
    }
  } catch (err) {
    console.error(`Error linking ${provider}:`, err);
    const errorKey = provider === 'github' ? 'settings.linkGithubError' : 'settings.linkDiscordError';
    onFailure(getFriendlyErrorMessage(err, t, errorKey));
  }
}

export async function unlinkOAuthProvider({
  provider,
  user,
  refreshUser,
  t,
  onStart,
  onSuccess,
  onFailure
}) {
  onStart();
  try {
    const targetIdentity = user?.identities?.find(id => id.provider === provider);
    if (!targetIdentity) {
      throw new Error(`No ${provider} identity found.`);
    }
    const { error } = await supabase.auth.unlinkIdentity(targetIdentity);
    if (error) throw error;

    const updatedUser = await refreshUser();
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user information.');
    }
    onSuccess();
  } catch (err) {
    console.error(`Error unlinking ${provider}:`, err);
    const errorKey = provider === 'github' ? 'settings.unlinkGithubError' : 'settings.unlinkDiscordError';
    onFailure(getFriendlyErrorMessage(err, t, errorKey));
  }
}
