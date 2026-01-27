import { useNavigate, useParams } from 'react-router-dom';
import { Plus, LayoutGrid, Box, Settings } from 'lucide-react';

export default function WorkspaceNavbar() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  // Mock data
  const workspaces = [
    { id: 'ws-1', name: 'Core Engineering' },
    { id: 'ws-2', name: 'Marketing Assets' },
    { id: 'ws-3', name: 'Personal Projects' }
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      
      {/* Section Header */}
      <div className="p-4 pt-6 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid size={12} />
          Workspaces
        </h3>
        <button className="text-gray-400 hover:text-gray-700">
           <Settings size={14} />
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {workspaces.map((ws) => {
          const isActive = workspaceId === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => navigate(`/app/ws/${ws.id}`)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-3 border ${
                isActive
                  ? 'bg-white border-gray-200 shadow-sm text-blue-700 font-medium'
                  : 'border-transparent text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
              }`}
            >
              <div className={`p-1 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                <Box size={14} />
              </div>
              {ws.name}
            </button>
          );
        })}
      </div>

      {/* Bottom Action */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <button
          onClick={() => navigate('/app/create-workspace')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm transition-all"
        >
          <Plus size={14} strokeWidth={3} />
          New Workspace
        </button>
      </div>
    </div>
  );
}