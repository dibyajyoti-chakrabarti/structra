import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import api from '../../api';

export default function CognitoCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      try {
        // Amplify exchanges the auth code automatically on page load.
        // Wait until tokens are actually populated before hitting the API.
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
      } catch {
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
