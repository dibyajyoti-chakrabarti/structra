import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from NotFound.jsx</h1>
      <p className="text-xl text-gray-600">404 - Page Not Found</p>
      <div className="flex gap-4">
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-500 text-white rounded">Go Home</button>
        <button onClick={() => navigate('/app')} className="px-4 py-2 bg-green-500 text-white rounded">Go to App</button>
      </div>
    </div>
  );
}