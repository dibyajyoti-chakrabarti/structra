import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Mail, Lock, ShieldCheck, Github, Chrome } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleBackToHome = () => navigate('/');

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 flex flex-col">
      
      {/* Top Bar with Back Button (Inspired by Pricing.jsx) */}
      <div className="p-8">
        <button
          onClick={handleBackToHome}
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors group px-4 py-2"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>
      </div>

      {/* Auth Container */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black tracking-tighter mb-2">structra<span className="text-blue-500">.cloud</span></h1>
            <p className="text-neutral-500 text-sm">Sign in to your decision intelligence workspace.</p>
          </div>

          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
            {!otpMode ? (
              <div className="space-y-6">
                {/* Social Logins */}
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-lg font-bold text-xs hover:bg-neutral-200 transition">
                    <Chrome size={14} /> Google
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 text-white border border-white/10 rounded-lg font-bold text-xs hover:bg-zinc-700 transition">
                    <Github size={14} /> GitHub
                  </button>
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">or continue with email</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Email Login */}
                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={() => navigate('/app')}
                  className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition"
                >
                  Sign In
                </button>
              </div>
            ) : (
              /* OTP Mode UI Refined */
              <div className="space-y-6">
                {!otpSent ? (
                  <>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                      <input
                        type="email"
                        placeholder="Verify email for code"
                        className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 rounded-xl text-sm outline-none"
                      />
                    </div>
                    <button onClick={() => setOtpSent(true)} className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm">Send Code</button>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                      <input
                        type="text"
                        placeholder="6-digit code"
                        className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 rounded-xl text-sm outline-none text-center tracking-[0.5em] font-bold"
                      />
                    </div>
                    <button onClick={() => navigate('/app')} className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm">Verify & Access</button>
                  </>
                )}
              </div>
            )}

            {/* Bottom Controls */}
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <button
                onClick={() => { setOtpMode(!otpMode); setOtpSent(false); }}
                className="w-full text-xs font-semibold text-neutral-500 hover:text-white transition"
              >
                {otpMode ? 'Sign in with Password' : 'Login via Magic Code'}
              </button>
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 uppercase tracking-tighter">
                <button onClick={() => navigate('/signup')} className="hover:text-white transition">Create Account</button>
                <button onClick={() => navigate('/privacy')} className="hover:text-white transition">Privacy Policy</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}