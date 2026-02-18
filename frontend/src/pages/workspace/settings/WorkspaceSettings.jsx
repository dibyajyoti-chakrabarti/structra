import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Settings, Users, Shield, FileText, ArrowLeft } from 'lucide-react';
import api from '../../../api';

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext(); // Get context from parent
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    const fetchWorkspaceRole = async () => {
      try {
        const response = await api.get(`workspaces/${workspaceId}/`);
        setIsAdmin(!!response.data?.is_admin);
      } catch {
        setIsAdmin(false);
      }
    };
    fetchWorkspaceRole();
  }, [workspaceId]);

  const showAdminOnlyError = () => {
    setRoleError('Action allowed only for admin.');
    setTimeout(() => setRoleError(''), 2500);
  };
  
  const navItems = [
    { name: 'General', path: `/app/ws/${workspaceId}/settings`, icon: Settings },
    { name: 'Team', path: `/app/ws/${workspaceId}/settings/team`, icon: Users },
    { name: 'Security', path: `/app/ws/${workspaceId}/settings/security`, icon: Shield },
    { name: 'Logs', path: `/app/ws/${workspaceId}/settings/logs`, icon: FileText },
  ];

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-8 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <div className="h-5 w-px bg-gray-200 shrink-0" />

          <nav className="flex items-center gap-1.5 overflow-x-auto">
            {navItems.map((item) => (
              item.name === 'Logs' && !isAdmin ? (
                <button
                  key={item.name}
                  type="button"
                  onClick={showAdminOnlyError}
                  className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-transparent text-gray-400 bg-gray-100 cursor-not-allowed whitespace-nowrap"
                >
                  <item.icon size={15} className="text-gray-300" />
                  <span className="text-sm font-medium">{item.name}</span>
                </button>
              ) : (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.name === 'General'}
                  className={({ isActive }) =>
                    `group inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={15}
                        className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </>
                  )}
                </NavLink>
              )
            ))}
          </nav>
        </div>
        {roleError && (
          <p className="mx-auto w-full max-w-6xl px-4 lg:px-8 pb-2 text-xs font-medium text-red-600">{roleError}</p>
        )}
      </header>

      <main className="min-w-0 overflow-y-auto flex-1">
        <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
          <Outlet context={{ ...context, isAdmin }} />
        </div>
      </main>
    </div>
  );
};

export default WorkspaceSettings;
