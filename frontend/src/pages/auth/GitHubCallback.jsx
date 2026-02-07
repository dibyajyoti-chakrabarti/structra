// src/pages/auth/GitHubCallback.jsx
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api'; // Your axios instance
import LoadingState from '../../components/LoadingState'; // Assuming you have this

const GitHubCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codeProcessed = useRef(false); // Prevent double-firing in strict mode

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code && !codeProcessed.current) {
        codeProcessed.current = true;
        
        const loginWithGitHub = async () => {
            try {
                const res = await api.post('auth/github/', { code });
                
                // Store tokens
                localStorage.setItem('access', res.data.access);
                localStorage.setItem('refresh', res.data.refresh);
                
                // Redirect
                if (res.data.user.is_new) {
                    navigate('/app/onboarding');
                } else {
                    navigate('/app');
                }
            } catch (error) {
                console.error("GitHub Login Failed", error);
                navigate('/login?error=github_failed');
            }
        };

        loginWithGitHub();
    } else if (!code) {
        navigate('/login');
    }
  }, [searchParams, navigate]);

  return <LoadingState />; // Or a simpler <div>Logging you in...</div>
};

export default GitHubCallback;