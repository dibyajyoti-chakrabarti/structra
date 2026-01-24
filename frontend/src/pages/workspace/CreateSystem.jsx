import { useNavigate, useParams } from 'react-router-dom';

export default function CreateSystem() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from CreateSystem.jsx</h1>
      <p className="text-gray-600">Workspace ID: {workspaceId}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate(`/app/ws/${workspaceId}`)} className="px-4 py-2 bg-blue-500 text-white rounded">Back to Workspace</button>
        <button onClick={() => navigate(`/app/ws/${workspaceId}/system/new-system`)} className="px-4 py-2 bg-green-500 text-white rounded">Create & Open System</button>
      </div>
    </div>
  );
}