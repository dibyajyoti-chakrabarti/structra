import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, Users, Clock } from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

const WorkspaceHome = () => {
  const navigate = useNavigate();

  // Mock data for display
  const workspaces = [
    { id: 1, name: "Core Engineering", members: 12, updated: '2h ago' },
    { id: 2, name: "Public Documentation", members: 840, updated: '5h ago' },
    { id: 3, name: "Integration Sandbox", members: 5, updated: '1d ago' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthenticatedNavbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Workspaces</h1>
            <p className="text-gray-500 mt-1">Manage your projects and team environments.</p>
          </div>
          <button 
            onClick={() => navigate('/app/create-workspace')}
            className="w-full md:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-100"
          >
            <Plus size={18} />
            Create Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Workspace Cards */}
          {workspaces.map((ws) => (
            <div 
              key={ws.id}
              onClick={() => navigate(`/app/ws/${ws.id}`)} 
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Layout size={24} />
                </div>
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-wider border border-gray-100">
                  Active
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{ws.name}</h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-gray-400" />
                  <span>{ws.members} members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" />
                  <span>{ws.updated}</span>
                </div>
              </div>
            </div>
          ))}

          {/* New Workspace Placeholder (Optional, looks good in grid) */}
          <button 
             onClick={() => navigate('/app/create-workspace')}
             className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group min-h-[200px]"
          >
             <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-3">
                <Plus size={24} />
             </div>
             <span className="font-semibold text-gray-500 group-hover:text-blue-700">Create new workspace</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceHome;