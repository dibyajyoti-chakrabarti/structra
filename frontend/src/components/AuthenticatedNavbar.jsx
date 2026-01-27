import { useNavigate } from 'react-router-dom';
import { User, Bell, Zap, Search } from 'lucide-react';
// Import the logo from your assets folder
import logo from '../assets/logo.png'; 

export default function AuthenticatedNavbar() {
  const navigate = useNavigate();

  return (
    <div className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Brand Emphasized with Logo */}
      <div 
        className="flex items-center gap-3 cursor-pointer group" 
        onClick={() => navigate('/')}
      >
        <img 
          src={logo} 
          alt="structra logo" 
          className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
        />
        <span className="text-xl font-extrabold tracking-tighter text-gray-900 flex items-center">
          structra
          <span className="text-blue-600">.cloud</span>
          {/* Subtle Enterprise Tag */}
          <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase tracking-widest bg-gray-100 text-gray-500 rounded border border-gray-200 font-bold">
            Beta
          </span>
        </span>
      </div>

      {/* Middle: Utility Search */}
      <div className="hidden lg:flex items-center bg-gray-50 px-4 py-2 rounded-full w-80 border border-gray-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
        <Search size={16} className="text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search models or spaces..." 
          className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6 text-sm font-semibold text-gray-600">
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => navigate('/docs')} className="hover:text-black transition-colors">
            Docs
          </button>
          <button onClick={() => navigate('/pricing')} className="flex items-center gap-1.5 hover:text-black transition-colors">
            <Zap size={14} className="fill-current" />
            Upgrade
          </button>
        </nav>

        <div className="h-6 w-[1px] bg-gray-200"></div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/notifications')}
            className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
          >
            <Bell size={20} />
          </button>

          {/* User Profile - Lucide Icon */}
          <button
            onClick={() => navigate('/app/profile')}
            className="w-9 h-9 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-sm transition-transform active:scale-95"
          >
            <User size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}