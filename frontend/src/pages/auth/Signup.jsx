import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Github, Chrome } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function Signup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      
      {/* Top Bar with Back Button */}
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
          {/* Brand Header */}
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
                <button className="flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-lg font-bold text-xs hover:bg-neutral-200 transition">
                  <Chrome size={14} /> Google
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 text-white border border-white/10 rounded-lg font-bold text-xs hover:bg-zinc-700 transition">
                  <Github size={14} /> GitHub
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">or create account</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Full name"
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="email"
                    placeholder="Work email"
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={() => navigate('/app')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition shadow-lg shadow-blue-500/10"
              >
                Get Started Free
              </button>

              <div className="mt-8 text-center">
                 <button onClick={() => navigate('/login')} className="text-xs font-bold text-neutral-500 hover:text-white transition">
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