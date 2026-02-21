import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, X, Star } from 'lucide-react';

export default function WorkspaceNavbar({
  isOpen,
  onClose,
  workspaces = [],
  loading = false,
  isDesktopCollapsed = false,
  onDesktopToggle,
  starringWorkspaceIds = [],
  onToggleWorkspaceStar,
}) {
  const navigate = useNavigate();
  const sortedWorkspaces = [...workspaces].sort((left, right) => {
    if (left.is_starred !== right.is_starred) {
      return Number(right.is_starred) - Number(left.is_starred);
    }
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });

  const NavContent = () => (
    <div className="h-full flex flex-col">
       <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Switch Workspace
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onDesktopToggle}
            className="hidden md:inline-flex text-gray-400 hover:text-gray-600 p-1 rounded"
            title="Collapse workspace sidebar"
            aria-label="Collapse workspace sidebar"
          >
            <ChevronLeft size={18} />
          </button>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="p-4 text-xs text-gray-400 animate-pulse font-semibold">
            Loading environments...
          </div>
        ) : (
          sortedWorkspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => {
                navigate(`/app/ws/${ws.id}`);
                if(onClose) onClose(); 
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/app/ws/${ws.id}`);
                  if (onClose) onClose();
                }
              }}
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-200"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-bold text-gray-800 text-sm group-hover:text-black text-left">
                  {ws.name}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {ws.member_count} {ws.member_count === 1 ? 'member' : 'members'} | {ws.visibility}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onToggleWorkspaceStar) {
                      onToggleWorkspaceStar(ws.id, !ws.is_starred);
                    }
                  }}
                  aria-label={ws.is_starred ? 'Unstar workspace' : 'Star workspace'}
                  title={ws.is_starred ? 'Unstar workspace' : 'Star workspace'}
                  disabled={starringWorkspaceIds.includes(ws.id)}
                  className="p-1 rounded text-gray-300 hover:text-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Star size={14} className={ws.is_starred ? 'fill-amber-400 text-amber-500' : ''} />
                </button>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
            onClick={() => {
              navigate('/app/create-workspace');
              if(onClose) onClose();
            }}
            className="w-full py-2.5 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg text-sm font-semibold text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
        >
          <Plus size={16} />
          Create Workspace
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`hidden md:flex h-full bg-white flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          isDesktopCollapsed
            ? "w-0 -translate-x-full opacity-0 pointer-events-none border-r-0"
            : "w-64 translate-x-0 opacity-100 border-r border-gray-200"
        }`}
      >
        <NavContent />
      </div>

      <div className={`md:hidden fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}/>
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
          <NavContent />
        </div>
      </div>
    </>
  );
}
