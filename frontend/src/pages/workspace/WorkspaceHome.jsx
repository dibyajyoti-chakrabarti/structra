import { useNavigate, useParams } from 'react-router-dom';

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from WorkspaceHome.jsx</h1>
      <p className="text-gray-600">Workspace ID: {workspaceId}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate('/app')} className="px-4 py-2 bg-blue-500 text-white rounded">All Workspaces</button>
        <button onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)} className="px-4 py-2 bg-green-500 text-white rounded">Create System</button>
        <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/general`)} className="px-4 py-2 bg-purple-500 text-white rounded">Settings</button>
        <button onClick={() => navigate(`/app/ws/${workspaceId}/system/system1`)} className="px-4 py-2 bg-orange-500 text-white rounded">Open System</button>
      </div>
    </div>
  );
}