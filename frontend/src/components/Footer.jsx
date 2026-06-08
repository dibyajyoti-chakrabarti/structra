import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { Twitter, Github, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-blue-100 bg-white text-slate-600">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          
          {/* Brand Column */}
          <div className="space-y-4 col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Structra" className="h-6 w-auto" />
              <span className="text-lg font-bold text-slate-900 tracking-tight">structra.cloud</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Enterprise-grade AI platform for system modeling, evaluation, and decision intelligence.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-slate-500 hover:text-blue-600 transition-colors"><Twitter size={18} /></a>
              <a href="#" className="text-slate-500 hover:text-blue-600 transition-colors"><Github size={18} /></a>
              <a href="#" className="text-slate-500 hover:text-blue-600 transition-colors"><Linkedin size={18} /></a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">Product</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
              <li><Link to="/signup" className="hover:text-blue-600 transition-colors">Get Started</Link></li>
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">Log In</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link></li>
              <li>
                <a href="mailto:support@structra.cloud" className="hover:text-blue-600 transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">Status</h3>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">Operational</p>
              <p className="mt-1 text-slate-600">All systems are currently available.</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-green-700">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live Monitoring
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {currentYear} Structra Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href="mailto:support@structra.cloud"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600"
            >
              <Mail size={14} />
              support@structra.cloud
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
