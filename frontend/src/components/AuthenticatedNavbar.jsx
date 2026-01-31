import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Zap, Search, Menu, X } from 'lucide-react';
// Import the logo from your assets folder
import logo from '../assets/logo.png'; 

export default function AuthenticatedNavbar() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between">
        
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

        {/* Middle: Utility Search (Desktop) */}
        <div className="hidden lg:flex items-center bg-gray-50 px-4 py-2 rounded-full w-80 border border-gray-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
          <Search size={16} className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search models or spaces..." 
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
          />
        </div>

        {/* Right: Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
          <nav className="flex items-center gap-6">
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

            {/* User Profile */}
            <button
              onClick={() => navigate('/app/profile')}
              className="w-9 h-9 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-sm transition-transform active:scale-95"
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Menu Toggle (Mobile Only) */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full left-0 shadow-lg animate-in slide-in-from-top-2 duration-200 px-4 py-6 space-y-6">
          
          {/* Mobile Search */}
          <div className="flex items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
            <Search size={16} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search models or spaces..." 
              className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-4 text-sm font-semibold text-gray-600">
            <button onClick={() => navigate('/docs')} className="text-left px-2 py-2 hover:bg-gray-50 rounded-lg">
              Docs
            </button>
            <button onClick={() => navigate('/pricing')} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-lg">
              <Zap size={16} className="fill-current" />
              Upgrade
            </button>
            
            <div className="h-px bg-gray-100 my-2"></div>

            <button onClick={() => navigate('/app/notifications')} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg">
              <Bell size={18} />
              Notifications
            </button>
            <button onClick={() => navigate('/app/profile')} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg">
              <div className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white rounded-full">
                <User size={12} />
              </div>
              Profile
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}