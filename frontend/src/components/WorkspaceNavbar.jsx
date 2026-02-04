import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, X } from 'lucide-react';

export default function WorkspaceNavbar({ isOpen, onClose, workspaces = [], loading = false }) {
  const navigate = useNavigate();

  const NavContent = () => (
    <div className="h-full flex flex-col">
       <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Switch Workspace
        </span>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="p-4 text-xs text-gray-400 animate-pulse font-semibold">
            Loading environments...
          </div>
        ) : (
          workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                navigate(`/app/ws/${ws.id}`);
                if(onClose) onClose(); 
              }}
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
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
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
      <div className="hidden md:flex w-64 h-full bg-white flex-col border-r border-gray-200">
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