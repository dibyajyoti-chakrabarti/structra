import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Github, Chrome } from 'lucide-react';
import logo from '../../assets/logo.png';
import api from '../../api';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [otpMode, setOtpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleLogin = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);
    try {
      const response = await api.post('auth/login/', formData);
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);

      // --- NEW CODE STARTS HERE ---
      // 1. Fetch the user's profile immediately after login
      const profileRes = await api.get('auth/profile/'); // Ensure this matches your backend URL structure
      
      // 2. Check if they are a new user
      if (profileRes.data.is_new) {
        navigate('/app/onboarding');
      } else {
        navigate('/app');
      }
      // --- NEW CODE ENDS HERE ---

    } catch (err) {
      console.error(err);
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 flex flex-col">
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
            <p className="text-neutral-500 text-sm font-medium uppercase tracking-widest text-[10px]">
              Intelligence That Scales
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-lg font-bold text-xs hover:bg-neutral-200 transition">
                  <Chrome size={14} /> Google
                </button>
                <button type="button" className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 text-white border border-white/10 rounded-lg font-bold text-xs hover:bg-zinc-700 transition">
                  <Github size={14} /> GitHub
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">or continue with email</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* 3. Updated: Added <form> wrapper */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="Work email"
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                
                {!otpMode && (
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      type="password"
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                )}

                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                {/* 4. Updated: Button type="submit" and removed onClick */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] transition disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button 
                  type="button"
                  onClick={() => setOtpMode(!otpMode)}
                  className="text-[11px] font-bold text-neutral-500 hover:text-white transition uppercase tracking-tighter"
                >
                  {otpMode ? 'Use Password' : 'Login via Code'}
                </button>
                <button type="button" onClick={() => navigate('/signup')} className="text-[11px] font-bold text-blue-500 hover:text-blue-400 transition uppercase tracking-tighter">
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}