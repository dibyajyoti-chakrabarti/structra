import { useNavigate } from 'react-router-dom';

export default function Navbar({ isScrolled = false }) {
  const navigate = useNavigate();

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#0a0a0a] border-b border-[#1f1f1f] shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className={`text-lg sm:text-xl font-semibold tracking-tight transition-colors duration-300 ${
            isScrolled ? 'text-white' : 'text-gray-900'
          }`}
        >
          structra.cloud
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm">
          <button 
            onClick={() => navigate('/pricing')} 
            className={`transition-colors duration-300 ${
              isScrolled 
                ? 'text-[#a3a3a3] hover:text-white' 
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Pricing
          </button>

          <button 
            onClick={() => navigate('/support')} 
            className={`transition-colors duration-300 ${
              isScrolled 
                ? 'text-[#a3a3a3] hover:text-white' 
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Support
          </button>

          <button 
            onClick={() => navigate('/login')} 
            className={`transition-colors duration-300 ${
              isScrolled 
                ? 'text-[#a3a3a3] hover:text-white' 
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Log in
          </button>

          <button
            onClick={() => navigate('/signup')}
            className={`px-5 py-2 rounded-md font-medium transition-all duration-300 ${
              isScrolled
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => navigate('/signup')}
          className={`md:hidden px-4 py-2 rounded-md font-medium text-sm transition-all duration-300 ${
            isScrolled
              ? 'bg-white text-black hover:bg-neutral-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          Sign up
        </button>
      </div>
    </nav>
  );
}