import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-lg font-semibold tracking-tight"
        >
          structra.cloud
        </button>

        <div className="flex items-center gap-8 text-sm text-[#a3a3a3]">
          <button onClick={() => navigate('/pricing')} className="hover:text-white transition">
            Pricing
          </button>

          <button onClick={() => navigate('/support')} className="hover:text-white transition">
            Support
          </button>

          <button onClick={() => navigate('/login')} className="hover:text-white transition">
            Log in
          </button>

          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
          >
            Sign up
          </button>
        </div>
      </div>
    </nav>
  );
}
