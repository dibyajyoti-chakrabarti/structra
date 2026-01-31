import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { Twitter, Github, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1f1f1f] text-[#a3a3a3]">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          
          {/* Brand Column */}
          <div className="space-y-4 col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Structra" className="h-6 w-auto opacity-80" />
              <span className="text-lg font-bold text-white tracking-tight">structra.cloud</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Enterprise-grade AI platform for system modeling, evaluation, and decision intelligence.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-[#a3a3a3] hover:text-white transition-colors"><Twitter size={18} /></a>
              <a href="#" className="text-[#a3a3a3] hover:text-white transition-colors"><Github size={18} /></a>
              <a href="#" className="text-[#a3a3a3] hover:text-white transition-colors"><Linkedin size={18} /></a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Product</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/features" className="hover:text-blue-500 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-500 transition-colors">Pricing</Link></li>
              <li><Link to="/security" className="hover:text-blue-500 transition-colors">Security</Link></li>
              <li><Link to="/changelog" className="hover:text-blue-500 transition-colors">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/docs" className="hover:text-blue-500 transition-colors">Documentation</Link></li>
              <li><Link to="/api" className="hover:text-blue-500 transition-colors">API Reference</Link></li>
              <li><Link to="/community" className="hover:text-blue-500 transition-colors">Community</Link></li>
              <li><Link to="/blog" className="hover:text-blue-500 transition-colors">Engineering Blog</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="hover:text-blue-500 transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-blue-500 transition-colors">Careers</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/terms" className="hover:text-blue-500 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1f1f1f] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {currentYear} Structra Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}