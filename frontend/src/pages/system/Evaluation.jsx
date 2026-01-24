import { useNavigate, useParams } from 'react-router-dom';

export default function Evaluation() {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from Evaluation.jsx</h1>
      <p className="text-gray-600">Workspace ID: {workspaceId}</p>
      <p className="text-gray-600">System ID: {systemId}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate(`/app/ws/${workspaceId}/system/${systemId}`)} className="px-4 py-2 bg-blue-500 text-white rounded">Back to Canvas</button>
      </div>
    </div>
  );
}