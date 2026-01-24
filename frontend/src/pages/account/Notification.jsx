import { useNavigate } from 'react-router-dom';

export default function Notification() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from Notification.jsx</h1>
      <div className="flex gap-4">
        <button onClick={() => navigate('/app')} className="px-4 py-2 bg-blue-500 text-white rounded">Back to Workspaces</button>
        <button onClick={() => navigate('/app/profile')} className="px-4 py-2 bg-green-500 text-white rounded">View Profile</button>
      </div>
    </div>
  );
}