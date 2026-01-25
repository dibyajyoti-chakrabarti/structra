import { useNavigate } from 'react-router-dom';

export default function AuthenticatedNavbar() {
  const navigate = useNavigate();

  return (
    <div className="h-14 bg-[#0a0a0a] border-b border-[#1f1f1f] px-6 flex items-center justify-between">
      {/* Left */}
      <div className="text-sm font-medium">
        structra.cloud
      </div>

      {/* Right */}
      <div className="flex items-center gap-6 text-sm text-[#a3a3a3]">
        <button onClick={() => navigate('/docs')} className="hover:text-white transition">
          Documentation
        </button>

        <button onClick={() => navigate('/pricing')} className="hover:text-white transition">
          Upgrade
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/app/notifications')}
          className="w-8 h-8 border border-[#2a2a2a] rounded-full text-xs"
        >
          N
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('/app/profile')}
          className="w-8 h-8 border border-[#2a2a2a] rounded-full text-xs"
        >
          P
        </button>
      </div>
    </div>
  );
}
