import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import WorkspaceNavbar from '../../components/WorkspaceNavbar';

const WorkspaceInstance = () => {
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <AuthenticatedNavbar />
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceNavbar />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden bg-white border-l border-gray-100">
          <div className="h-full w-full max-w-[1600px] mx-auto p-10 overflow-y-auto">
            <Outlet /> 
          </div>
        </main>
      </div>
    </div>
  );
};

export const WorkspaceOverview = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const stats = [
    { label: 'Total Systems', value: '12' },
    { label: 'Active Evaluations', value: '5' },
    { label: 'Team Members', value: '8' }
  ];

  const systems = [
    { id: 1, name: 'Supply Chain Model', status: 'Active', updated: '2h ago' },
    { id: 2, name: 'Cloud Infrastructure', status: 'Draft', updated: '5h ago' },
    { id: 3, name: 'Financial Pipeline', status: 'Active', updated: '1d ago' },
  ];

  return (
    <div>
       <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workspace {workspaceId}</h1>
            <p className="text-gray-500">Overview of your systems and evaluations.</p>
          </div>
          <button 
            onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
          >
            + New System
          </button>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
       </div>

       {/* Systems List */}
       <h2 className="text-xl font-bold text-gray-800 mb-4">Systems</h2>
       <div className="grid grid-cols-1 gap-3">
          {systems.map((system) => (
            <div key={system.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center hover:border-blue-400 transition-all cursor-pointer">
              <div>
                <h3 className="font-bold text-gray-900">{system.name}</h3>
                <p className="text-sm text-gray-500">Last updated {system.updated}</p>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${system.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                {system.status}
              </span>
            </div>
          ))}
       </div>
    </div>
  );
};

export default WorkspaceInstance;