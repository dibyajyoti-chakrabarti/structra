import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';
import api from '../../api';

export default function CognitoCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Amplify automatically exchanges the auth code in the URL when the page
    // loads (configured via oauth.responseType = 'code'). We just need to
    // wait for the session to be ready, then fetch the Django profile.
    const run = async () => {
      try {
        await getCurrentUser();
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
