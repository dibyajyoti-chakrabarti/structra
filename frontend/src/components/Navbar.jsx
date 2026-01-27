import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Navbar({ isScrolled = false }) {
  const navigate = useNavigate();

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1f1f1f] shadow-lg' 
          : 'bg-transparent backdrop-blur-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 group transition-transform active:scale-95"
        >
          {/* Logo stays original color - filters removed */}
          <img 
            src={logo} 
            alt="structra logo" 
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
          />
          
          {/* Text still flips for readability */}
          <span className={`text-xl font-extrabold tracking-tighter transition-colors duration-300 ${
            isScrolled ? 'text-white' : 'text-gray-900'
          }`}>
            structra<span className="text-blue-600">.cloud</span>
          </span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold">
          <button 
            onClick={() => navigate('/pricing')} 
            className={`transition-colors duration-300 ${
              isScrolled ? 'text-[#a3a3a3] hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pricing
          </button>

          <button 
            onClick={() => navigate('/login')} 
            className={`transition-colors duration-300 ${
              isScrolled ? 'text-[#a3a3a3] hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Log in
          </button>

          <button
            onClick={() => navigate('/signup')}
            className={`px-5 py-2.5 rounded-lg font-bold transition-all duration-300 transform hover:-translate-y-0.5 ${
              isScrolled
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            Sign up
          </button>
        </div>
      </div>
    </nav>
  );
}