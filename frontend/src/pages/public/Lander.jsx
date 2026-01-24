import { useNavigate } from 'react-router-dom';

export default function Lander() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from Lander.jsx</h1>
      <div className="flex gap-4">
        <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-blue-500 text-white rounded">Go to Pricing</button>
        <button onClick={() => navigate('/login')} className="px-4 py-2 bg-green-500 text-white rounded">Login</button>
        <button onClick={() => navigate('/signup')} className="px-4 py-2 bg-purple-500 text-white rounded">Signup</button>
      </div>
    </div>
  );
}