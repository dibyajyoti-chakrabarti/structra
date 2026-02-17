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
    <div className="h-full bg-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
          <div className="p-5 lg:p-6">
            <button
              onClick={() => navigate(`/app/ws/${workspaceId}`)}
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to workspace
            </button>

            <div className="mb-4 px-1">
              <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Manage workspace configuration.</p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.name === 'General'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={16}
                        className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto bg-gray-50">
          <div className="mx-auto w-full max-w-5xl p-5 lg:p-8">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default WorkspaceSettings;
