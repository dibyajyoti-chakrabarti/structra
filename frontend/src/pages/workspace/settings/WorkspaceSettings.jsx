import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Settings, Users, Shield, FileText, ArrowLeft } from 'lucide-react';
import api from '../../../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

  .wset-root {
    height: 100%;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* ── Top nav bar ── */
  .wset-topbar {
    background: var(--surface);
    border-bottom: 1.5px solid var(--border);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .wset-topbar-inner {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 24px;
    height: 50px;
    width: 100%;
  }

  .wset-back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 50px; padding: 0 12px 0 0;
    background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 600;
    color: var(--text-muted); white-space: nowrap;
    transition: color 0.1s;
    flex-shrink: 0;
  }
  .wset-back-btn:hover { color: var(--text); }

  .wset-divider {
    width: 1px; height: 18px;
    background: var(--border);
    margin: 0 12px 0 0;
    flex-shrink: 0;
  }

  .wset-nav {
    display: flex; align-items: center; gap: 2px;
    overflow-x: auto;
    flex: 1;
  }
  .wset-nav::-webkit-scrollbar { display: none; }

  .wset-nav-link {
    display: inline-flex; align-items: center; gap: 7px;
    height: 50px; padding: 0 12px;
    font-family: inherit; font-size: 13px; font-weight: 500;
    color: var(--text-muted); white-space: nowrap;
    text-decoration: none; border: none; background: none;
    cursor: pointer; position: relative;
    transition: color 0.1s;
  }
  .wset-nav-link::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 2px; background: var(--accent);
    opacity: 0; transition: opacity 0.15s;
  }
  .wset-nav-link:hover { color: var(--text); }
  .wset-nav-link.active { color: var(--accent); font-weight: 650; }
  .wset-nav-link.active::after { opacity: 1; }
  .wset-nav-link.disabled { color: var(--border-strong); cursor: not-allowed; }
  .wset-nav-link.disabled:hover { color: var(--border-strong); }

  .wset-role-error {
    font-size: 11.5px; color: var(--danger);
    padding: 6px 24px; background: rgba(239, 68, 68, 0.12);
    border-top: 1px solid rgba(239, 68, 68, 0.35);
    font-weight: 500;
  }

  /* ── Main content ── */
  .wset-main {
    flex: 1; overflow-y: auto; min-width: 0;
  }

  .wset-main-inner {
    padding: 32px 24px 64px;
  }

  @media (max-width: 640px) {
    .wset-topbar-inner { padding: 0 16px; }
    .wset-main-inner { padding: 20px 16px 48px; }
  }
`;

const navItems = (workspaceId) => [
  { name: 'General', path: `/app/ws/${workspaceId}/settings`, icon: Settings },
  { name: 'Team', path: `/app/ws/${workspaceId}/settings/team`, icon: Users },
  { name: 'Security', path: `/app/ws/${workspaceId}/settings/security`, icon: Shield },
  { name: 'Logs', path: `/app/ws/${workspaceId}/settings/logs`, icon: FileText, adminOnly: true },
];

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const r = await api.get(`workspaces/${workspaceId}/`);
        setIsAdmin(!!r.data?.is_admin);
      } catch { setIsAdmin(false); }
    };
    fetchRole();
  }, [workspaceId]);

  const showAdminOnly = () => {
    setRoleError('This section is restricted to workspace admins.');
    setTimeout(() => setRoleError(''), 3000);
  };

  const items = navItems(workspaceId);

  return (
    <div className="wset-root">
      <style>{styles}</style>

      <header className="wset-topbar">
        <div className="wset-topbar-inner">
          <button className="wset-back-btn" onClick={() => navigate(`/app/ws/${workspaceId}`)}>
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="wset-divider" />
          <nav className="wset-nav">
            {items.map((item) => {
              const isLocked = item.adminOnly && !isAdmin;
              if (isLocked) {
                return (
                  <button
                    key={item.name}
                    type="button"
                    className="wset-nav-link disabled"
                    onClick={showAdminOnly}
                  >
                    <item.icon size={14} />
                    {item.name}
                  </button>
                );
              }
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.name === 'General'}
                  className={({ isActive }) => `wset-nav-link${isActive ? ' active' : ''}`}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={14} style={{ opacity: isActive ? 1 : 0.6 }} />
                      {item.name}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
        {roleError && <div className="wset-role-error">{roleError}</div>}
      </header>

      <main className="wset-main">
        <div className="wset-main-inner">
          <Outlet context={{ ...context, isAdmin }} />
        </div>
      </main>
    </div>
  );
};

export default WorkspaceSettings;
