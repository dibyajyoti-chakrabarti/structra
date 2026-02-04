import { NavLink, Outlet, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Settings, Users, Shield, FileText, ArrowLeft } from 'lucide-react';

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext(); // Get context from parent
  
  const navItems = [
    { name: 'General', path: `/app/ws/${workspaceId}/settings`, icon: Settings },
    { name: 'Team', path: `/app/ws/${workspaceId}/settings/team`, icon: Users },
    { name: 'Security', path: `/app/ws/${workspaceId}/settings/security`, icon: Shield },
    { name: 'Logs', path: `/app/ws/${workspaceId}/settings/logs`, icon: FileText },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full bg-white">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 border-r border-gray-100 p-6 lg:p-8 flex-shrink-0">
        {/* Back Button */}
        <button 
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 -ml-3 rounded-lg transition-all font-bold text-sm"
        >
            <ArrowLeft size={18} />
            Back to Systems
        </button>

        <div className="mb-8">
            <h1 className="text-xl lg:text-2xl font-extrabold text-gray-900 tracking-tight">
              Settings
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Manage workspace preferences.</p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.name === 'General'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon 
                    size={20} 
                    className={isActive ? "text-blue-600" : "text-gray-400"} 
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-4xl h-full flex flex-col">
           <Outlet context={context} /> {/* ✅ Pass context to children */}
        </div>
      </main>
    </div>
  );
};

export default WorkspaceSettings;