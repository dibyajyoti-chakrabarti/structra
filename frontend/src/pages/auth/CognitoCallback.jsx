import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, signInWithRedirect } from 'aws-amplify/auth';
import api from '../../api';

const PROVIDER_KEY = 'structra_oauth_provider';
const LINK_RETRY_KEY = 'structra_link_retry';

export function storeOAuthProvider(provider) {
  sessionStorage.setItem(PROVIDER_KEY, JSON.stringify(provider));
}

export default function CognitoCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      // Cognito sends errors back as query params when the Pre Sign-up
      // Lambda raises an exception (e.g. after account linking).
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const errorDesc = params.get('error_description') || '';

      if (error) {
        const isLinkError =
          error === 'UserLambdaValidationException' &&
          errorDesc.includes('AccountLinked');

        if (isLinkError) {
          const retryCount = parseInt(sessionStorage.getItem(LINK_RETRY_KEY) || '0', 10);
          const storedProvider = sessionStorage.getItem(PROVIDER_KEY);

          if (storedProvider && retryCount < 2) {
            sessionStorage.setItem(LINK_RETRY_KEY, String(retryCount + 1));
            // Accounts are now linked — retry sign-in immediately.
            // GitHub/Google will skip the consent screen on the retry.
            const provider = JSON.parse(storedProvider);
            await signInWithRedirect({ provider });
            return;
          }
        }

        // Unrecoverable error
        sessionStorage.removeItem(PROVIDER_KEY);
        sessionStorage.removeItem(LINK_RETRY_KEY);
        console.error('[CognitoCallback] OAuth error:', error, errorDesc);
        navigate('/login', { replace: true });
        return;
      }

      // Happy path — clear any lingering retry state
      sessionStorage.removeItem(PROVIDER_KEY);
      sessionStorage.removeItem(LINK_RETRY_KEY);

      try {
        let session = await fetchAuthSession();
        if (!session?.tokens?.idToken) {
          session = await fetchAuthSession({ forceRefresh: true });
        }
        if (!session?.tokens?.idToken) {
          throw new Error('No tokens after OAuth callback');
        }
        const profile = await api.get('auth/profile/');
        if (profile.data?.is_new) {
          navigate('/app/onboarding', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      } catch (err) {
        console.error('[CognitoCallback] OAuth callback failed:', err?.name, err?.message);
        navigate('/login', { replace: true });
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Completing sign in…</p>
    </div>
  );
}
