import { NavLink, Outlet, useParams } from 'react-router-dom';

const WorkspaceSettings = () => {
  const { id } = useParams();
  
  const navItems = [
    { name: 'General', path: `/workspace/${id}/settings` },
    { name: 'Team', path: `/workspace/${id}/settings/team` },
    { name: 'Security', path: `/workspace/${id}/settings/security` },
    { name: 'Logs', path: `/workspace/${id}/settings/logs` },
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
                `block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
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