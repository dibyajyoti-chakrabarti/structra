import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { ArrowLeft, User, Mail, Lock, Github, Chrome, KeyRound } from 'lucide-react';
import logo from '../../assets/logo.png';
import api from '../../api';

export default function Signup() {
  const navigate = useNavigate();
  // Added confirmPassword to state
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupMethod, setSignupMethod] = useState('password');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Send access token to backend for signup
        const res = await api.post('auth/google/', {
          access_token: tokenResponse.access_token,
        });

        // Store tokens
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('refresh', res.data.refresh);

        // Navigate based on user status
        if (res.data.user.is_new) {
          navigate('/app/onboarding');
        } else {
          navigate('/app');
        }
      } catch (err) {
        console.error('Google Signup Failed', err);
        setError('Google signup failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google signup failed'),
  });

  const handleGitHubLogin = () => {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const REDIRECT_URI = "http://localhost:5173/auth/github/callback";

    if (!CLIENT_ID) {
      alert("GitHub Client ID not loaded");
      return;
    }

    window.location.href =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=user:email`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validate Passwords Match
    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post('auth/register/', formData);
      alert('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpMessage('');

    if (!formData.full_name.trim()) {
      setError('Full name is required for OTP signup.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required for OTP signup.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('auth/email-otp/request/', {
        email: formData.email,
        purpose: 'signup',
      });
      setOtpSent(true);
      setOtpMessage(`OTP sent. It expires in ${res.data.expires_in_minutes || 10} minutes.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode.trim()) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('auth/email-otp/verify/', {
        email: formData.email,
        otp: otpCode,
        purpose: 'signup',
        full_name: formData.full_name,
      });

      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);

      navigate('/app/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <div className="p-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors group px-4 py-2"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 flex flex-col items-center">
            <img src={logo} alt="Logo" className="h-10 w-auto mb-4 object-contain" />
            <h1 className="text-3xl font-black tracking-tighter mb-2">
              structra<span className="text-blue-500">.cloud</span>
            </h1>
            <p className="text-neutral-500 text-sm">Join the next generation of architecture modeling.</p>
          </div>

          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => googleLogin()} className="flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-lg font-bold text-xs hover:bg-neutral-200 transition">
                  <Chrome size={14} /> Google
                </button>
                <button type="button" onClick={handleGitHubLogin} className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 text-white border border-white/10 rounded-lg font-bold text-xs hover:bg-zinc-700 transition">
                  <Github size={14} /> GitHub
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">or create account</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-black/30 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSignupMethod('password');
                    setError('');
                    setOtpMessage('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    signupMethod === 'password'
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupMethod('otp');
                    setError('');
                    setOtpMessage('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    signupMethod === 'otp'
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <KeyRound size={12} /> Email OTP
                </button>
              </div>

              <form onSubmit={signupMethod === 'password' ? handleSubmit : (otpSent ? handleVerifyOtp : handleRequestOtp)} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    type="text"
                    placeholder="Full name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="Work email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                {signupMethod === 'password' ? (
                  <>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        type="password"
                        placeholder="Password"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        placeholder="Confirm Password"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {otpSent && (
                      <div className="relative group">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    )}
                    {otpMessage && <p className="text-green-400 text-xs text-center">{otpMessage}</p>}
                    {otpSent && (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="w-full py-2.5 border border-white/10 text-neutral-300 rounded-xl text-xs font-bold hover:bg-white/5 transition disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </>
                )}

                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition shadow-lg shadow-blue-500/10 disabled:opacity-50"
                >
                  {loading
                    ? 'Please wait...'
                    : signupMethod === 'password'
                    ? 'Get Started Free'
                    : otpSent
                    ? 'Verify OTP & Create Account'
                    : 'Send OTP'}
                </button>
              </form>

              <div className="mt-8 text-center">
                 <button type="button" onClick={() => navigate('/login')} className="text-xs font-bold text-neutral-500 hover:text-white transition">
                   Already have an account? <span className="text-blue-500 ml-1">Log in</span>
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
