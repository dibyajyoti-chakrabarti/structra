import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  
  return (
    <footer className="bg-gray-900 text-white p-8 mt-auto">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <p className="text-sm">© 2026 Structra.cloud</p>
        </div>
        <div className="flex gap-6">
          <button onClick={() => navigate('/terms')} className="text-sm hover:text-gray-300">Terms</button>
          <button onClick={() => navigate('/privacy')} className="text-sm hover:text-gray-300">Privacy</button>
          <button onClick={() => navigate('/support')} className="text-sm hover:text-gray-300">Support</button>
          <button onClick={() => navigate('/pricing')} className="text-sm hover:text-gray-300">Pricing</button>
        </div>
      </div>
    </footer>
  );
}