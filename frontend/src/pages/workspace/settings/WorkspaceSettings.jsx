import { NavLink, Outlet, useParams } from 'react-router-dom';

const WorkspaceSettings = () => {
  // Fix 1: Use the correct parameter name 'workspaceId' to match App.jsx
  const { workspaceId } = useParams();
  
  const navItems = [
    // Fix 2: Update paths to match the actual route structure: /app/ws/:id/settings/...
    { name: 'General', path: `/app/ws/${workspaceId}/settings` },
    { name: 'Team', path: `/app/ws/${workspaceId}/settings/team` },
    { name: 'Security', path: `/app/ws/${workspaceId}/settings/security` },
    { name: 'Logs', path: `/app/ws/${workspaceId}/settings/logs` },
  ];

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.name === 'General'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default WorkspaceSettings;