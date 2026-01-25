import { useNavigate, useParams } from 'react-router-dom';

export default function WorkspaceNavbar() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const workspaces = ['ws-1', 'ws-2', 'ws-3'];

  return (
    <div className="w-56 bg-[#0a0a0a] border-r border-[#1f1f1f] p-4">
      <div className="text-xs text-[#6b6b6b] mb-4">
        Workspaces
      </div>

      <div className="space-y-2">
        {workspaces.map((ws) => (
          <button
            key={ws}
            onClick={() => navigate(`/app/ws/${ws}`)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
              workspaceId === ws
                ? 'bg-[#111111] text-white'
                : 'text-[#a3a3a3] hover:bg-[#111111]'
            }`}
          >
            {ws}
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[#1f1f1f]">
        <button
          onClick={() => navigate('/app/create-workspace')}
          className="w-full text-xs text-[#a3a3a3] hover:text-white transition"
        >
          + Create workspace
        </button>
      </div>
    </div>
  );
}
