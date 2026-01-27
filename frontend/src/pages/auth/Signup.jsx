import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, CheckCircle2, Github, Chrome } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 flex flex-col">
      
      {/* Top Bar with Back Button (Identical to Login/Pricing) */}
      <div className="p-8">
        <button
          onClick={() => navigate('/')}
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
            <h1 className="text-3xl font-black tracking-tighter mb-2">
              structra<span className="text-blue-500">.cloud</span>
            </h1>
            <p className="text-neutral-500 text-sm">Create your intelligence workspace.</p>
          </div>

          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
            {!submitted ? (
              <div className="space-y-6">
                {/* Social Signups */}
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
                  <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">or use email</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Signup Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={16} />
                      <input
                        type="text"
                        placeholder="First name"
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="Last name"
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={16} />
                    <input
                      type="email"
                      placeholder="Work email"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={16} />
                    <input
                      type="password"
                      placeholder="Create password"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setSubmitted(true)}
                  className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition"
                >
                  Create Account
                </button>

                <p className="text-[10px] text-center text-neutral-600 leading-relaxed px-4">
                  By signing up, you agree to our <button className="text-neutral-400 hover:text-white underline">Terms</button> and <button className="text-neutral-400 hover:text-white underline">Privacy Policy</button>.
                </p>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                   <button onClick={() => navigate('/login')} className="text-xs font-bold text-neutral-500 hover:text-white transition">
                     Already have an account? <span className="text-blue-500">Sign in</span>
                   </button>
                </div>
              </div>
            ) : (
              /* Success State */
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} className="text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold mb-4 tracking-tight">Check your inbox.</h1>
                <p className="text-neutral-500 text-sm leading-relaxed mb-8">
                  We've sent a verification link to your email. Please click the link to activate your workspace.
                </p>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition shadow-lg"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}