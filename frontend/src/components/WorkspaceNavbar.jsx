import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';

export default function WorkspaceNavbar() {
  const navigate = useNavigate();

  // Mock Workspace Data with member counts
  const workspaces = [
    { id: 1, name: "Core Engineering", visibility: "Private", members: 12 },
    { id: 2, name: "Public Documentation", visibility: "Public", members: 840 },
    { id: 3, name: "Integration Sandbox", visibility: "Private", members: 5 },
    { id: 4, name: "Mobile App API", visibility: "Private", members: 3 }
  ];

  return (
    <div className="w-full md:w-64 h-full bg-white flex flex-col border-r border-gray-200">
      
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Switch Workspace
        </span>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => navigate(`/workspace/${ws.id}`)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-200"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-bold text-gray-800 text-sm group-hover:text-black">
                {ws.name}
              </span>
              
              {/* Member Count & Visibility Text */}
              <span className="text-xs text-gray-500 font-medium">
                {ws.members} members | {ws.visibility}
              </span>
            </div>

            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
        ))}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-gray-100">
        <button 
            onClick={() => navigate('/create-workspace')}
            className="w-full py-2.5 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg text-sm font-semibold text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
        >
          <Plus size={16} />
          <span>New Workspace</span>
        </button>
      </div>
    </div>
  );
}