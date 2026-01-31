import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="border-b border-neutral-800 bg-[#0a0a0a] fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="structra logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
            <span className="text-xl font-extrabold tracking-tighter text-white">
              structra<span className="text-blue-500">.cloud</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Removed Features and Documentation */}
            <Link to="/pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Pricing</Link>
            
            <div className="h-6 w-px bg-neutral-800" />
            
            <button onClick={() => navigate("/login")} className="text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
              Log in
            </button>
            <button onClick={() => navigate("/signup")} className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-neutral-200 transition-all">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-neutral-400 hover:text-white rounded-md focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-neutral-800 px-4 pt-2 pb-6 space-y-4 animate-in slide-in-from-top-5 duration-200">
          {/* Removed Features and Documentation */}
          <Link to="/pricing" className="block text-base font-medium text-neutral-400 hover:text-white py-2" onClick={() => setIsOpen(false)}>Pricing</Link>
          
          <div className="h-px bg-neutral-800 my-4" />
          
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate("/login")} className="w-full py-3 text-sm font-bold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800">
              Log in
            </button>
            <button onClick={() => navigate("/signup")} className="w-full py-3 text-sm font-bold text-black bg-white rounded-lg hover:bg-neutral-200">
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}