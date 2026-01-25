import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1f1f1f] mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left */}
          <div>
            <p className="text-sm text-[#a3a3a3]">
              structra.cloud
            </p>
            <p className="mt-2 text-xs text-[#6b6b6b]">
              Enterprise AI for system modeling and decision intelligence.
            </p>
          </div>

          {/* Right */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-[#a3a3a3]">
            <button onClick={() => navigate('/terms')} className="hover:text-white transition">
              Terms
            </button>

            <button onClick={() => navigate('/privacy')} className="hover:text-white transition">
              Privacy
            </button>

            <button onClick={() => navigate('/support')} className="hover:text-white transition">
              Support
            </button>

            <button onClick={() => navigate('/pricing')} className="hover:text-white transition">
              Pricing
            </button>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#1f1f1f] text-xs text-[#6b6b6b]">
          © 2026 structra.cloud
        </div>
      </div>
    </footer>
  );
}
