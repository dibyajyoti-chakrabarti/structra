import { useNavigate, useParams, Outlet } from 'react-router-dom';

export default function WorkspaceSettings() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col p-8">
      <div className="flex flex-col items-center justify-center gap-4 mb-8">
        <h1 className="text-4xl font-bold">Hello from WorkspaceSettings.jsx</h1>
        <p className="text-gray-600">Workspace ID: {workspaceId}</p>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/general`)} className="px-3 py-1 bg-gray-200 rounded">General</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/team`)} className="px-3 py-1 bg-gray-200 rounded">Team</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/security`)} className="px-3 py-1 bg-gray-200 rounded">Security</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/iam`)} className="px-3 py-1 bg-gray-200 rounded">IAM</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/visibility`)} className="px-3 py-1 bg-gray-200 rounded">Visibility</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/logs`)} className="px-3 py-1 bg-gray-200 rounded">Logs</button>
        </div>
        <button onClick={() => navigate(`/app/ws/${workspaceId}`)} className="px-4 py-2 bg-blue-500 text-white rounded">Back to Workspace</button>
      </div>
      <div className="border-t pt-8">
        <Outlet />
      </div>
    </div>
  );
}