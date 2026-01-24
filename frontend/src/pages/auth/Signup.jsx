import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from Signup.jsx</h1>
      <div className="flex gap-4">
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-500 text-white rounded">Back to Home</button>
        <button onClick={() => navigate('/login')} className="px-4 py-2 bg-green-500 text-white rounded">Login</button>
        <button onClick={() => navigate('/app')} className="px-4 py-2 bg-purple-500 text-white rounded">Sign Up (Go to App)</button>
      </div>
    </div>
  );
}