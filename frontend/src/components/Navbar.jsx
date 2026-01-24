import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <button onClick={() => navigate('/')} className="text-xl font-bold">Structra.cloud</button>
        <div className="flex gap-4">
          <button onClick={() => navigate('/pricing')} className="hover:text-gray-300">Pricing</button>
          <button onClick={() => navigate('/support')} className="hover:text-gray-300">Support</button>
          <button onClick={() => navigate('/login')} className="hover:text-gray-300">Login</button>
          <button onClick={() => navigate('/signup')} className="px-4 py-1 bg-blue-500 rounded hover:bg-blue-600">Sign Up</button>
        </div>
      </div>
    </nav>
  );
}