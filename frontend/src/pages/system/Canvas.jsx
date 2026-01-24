import { useNavigate, useParams } from 'react-router-dom';

export default function Canvas() {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from Canvas.jsx</h1>
      <p className="text-gray-600">Workspace ID: {workspaceId}</p>
      <p className="text-gray-600">System ID: {systemId}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate(`/app/ws/${workspaceId}`)} className="px-4 py-2 bg-blue-500 text-white rounded">Back to Workspace</button>
        <button onClick={() => navigate(`/app/ws/${workspaceId}/system/${systemId}/evaluate`)} className="px-4 py-2 bg-green-500 text-white rounded">Evaluate</button>
        <button onClick={() => navigate(`/app/ws/${workspaceId}/system/${systemId}/present`)} className="px-4 py-2 bg-purple-500 text-white rounded">Present</button>
      </div>
    </div>
  );
}
