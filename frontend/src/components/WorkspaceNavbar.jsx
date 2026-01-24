import { useNavigate, useParams } from 'react-router-dom';

export default function WorkspaceNavbar() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  
  return (
    <nav className="bg-gray-700 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <button onClick={() => navigate('/app')} className="text-xl font-bold">Workspace: {workspaceId}</button>
        <div className="flex gap-4">
          <button onClick={() => navigate(`/app/ws/${workspaceId}`)} className="hover:text-gray-300">Systems</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/settings/general`)} className="hover:text-gray-300">Settings</button>
          <button onClick={() => navigate('/docs')} className="hover:text-gray-300">Docs</button>
          <button onClick={() => navigate('/app/notifications')} className="hover:text-gray-300">Notifications</button>
        </div>
      </div>
    </nav>
  );
}