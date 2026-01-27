import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1f1f1f] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-8 sm:mb-10">
          
          {/* Brand Section */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div 
              className="flex items-center gap-3 mb-4 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img src={logo} alt="Logo" className="h-7 w-auto object-contain" />
              <h3 className="text-xl font-black tracking-tighter text-white">
                structra<span className="text-blue-500">.cloud</span>
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#6b6b6b] leading-relaxed max-w-xs">
              Enterprise AI for system modeling and decision intelligence. 
              Transform complex architectures into actionable insights.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#f5f5f5] mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => navigate('/pricing')} 
                  className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/docs')} 
                  className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Documentation
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/changelog')} 
                  className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Changelog
                </button>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#f5f5f5] mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <button className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors">About</button>
              </li>
              <li>
                <button className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors">Blog</button>
              </li>
              <li>
                <button className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors">Careers</button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#f5f5f5] mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => navigate('/privacy')} 
                  className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/terms')} 
                  className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button className="text-xs sm:text-sm text-[#a3a3a3] hover:text-white transition-colors">Security</button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#1f1f1f] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-[#404040] font-medium uppercase tracking-widest">
            © {new Date().getFullYear()} structra cloud inc. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <button className="text-[#6b6b6b] hover:text-white transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </button>
            <button className="text-[#6b6b6b] hover:text-white transition-colors">
              <span className="sr-only">GitHub</span>
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}