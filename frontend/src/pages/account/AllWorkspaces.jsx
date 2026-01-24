import { useNavigate } from 'react-router-dom';

export default function AllWorkspaces() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from AllWorkspaces.jsx</h1>
      <div className="flex gap-4">
        <button onClick={() => navigate('/app/profile')} className="px-4 py-2 bg-blue-500 text-white rounded">View Profile</button>
        <button onClick={() => navigate('/app/notifications')} className="px-4 py-2 bg-green-500 text-white rounded">Notifications</button>
        <button onClick={() => navigate('/app/create-workspace')} className="px-4 py-2 bg-purple-500 text-white rounded">Create Workspace</button>
        <button onClick={() => navigate('/app/ws/workspace1')} className="px-4 py-2 bg-orange-500 text-white rounded">Open Workspace</button>
      </div>
    </div>
  );
}