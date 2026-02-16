import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="structra logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
            <span className="text-xl font-extrabold tracking-tighter text-slate-900">
              structra<span className="text-blue-600">.cloud</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() =>
                window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
              }
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700"
            >
              Platform
            </button>
            <Link to="/pricing" className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700">
              Pricing
            </Link>
            
            <div className="h-6 w-px bg-blue-100" />
            
            <button onClick={() => navigate("/login")} className="text-sm font-bold text-slate-700 transition-colors hover:text-blue-700">
              Log in
            </button>
            <button onClick={() => navigate("/signup")} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="animate-in slide-in-from-top-5 space-y-4 border-b border-blue-100 bg-white px-4 pb-6 pt-2 duration-200 md:hidden">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
              setIsOpen(false);
            }}
            className="block py-2 text-base font-semibold text-slate-700 hover:text-blue-700"
          >
            Platform
          </button>
          <Link to="/pricing" className="block py-2 text-base font-semibold text-slate-700 hover:text-blue-700" onClick={() => setIsOpen(false)}>
            Pricing
          </Link>
          
          <div className="my-4 h-px bg-blue-100" />
          
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate("/login")} className="w-full rounded-lg border border-blue-200 bg-white py-3 text-sm font-bold text-blue-700 hover:bg-blue-50">
              Log in
            </button>
            <button onClick={() => navigate("/signup")} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
