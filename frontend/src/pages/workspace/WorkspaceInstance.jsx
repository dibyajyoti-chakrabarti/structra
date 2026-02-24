import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Menu, Settings, Trash2, X, CheckCircle, AlertCircle,
  ChevronRight, Search, Users, ChevronDown, ChevronUp, Star, Plus, Layout,
} from "lucide-react";
import AuthenticatedNavbar from "../../components/AuthenticatedNavbar";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import api from "../../api";
import LoadingState from "../../components/LoadingState";

// ─── Shared styles ────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

  .wi-root { display: flex; flex-direction: column; height: 100vh; background: #fafafa; overflow: hidden; font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; }
  .wi-body { display: flex; flex: 1; overflow: hidden; position: relative; }
  .wi-main { flex: 1; overflow: hidden; background: #fafafa; position: relative; z-index: 0; }
  .wi-main-inner { height: 100%; overflow-y: auto; padding: 32px 36px 60px; max-width: 1200px; margin: 0 auto; }
  .wi-main-inner.wi-main-inner-wide { max-width: none; margin: 0; padding: 0; }

  /* Mobile top bar */
  .wi-mobile-bar {
    display: none;
    align-items: center; gap: 10px;
    padding: 10px 16px;
    border-bottom: 1.5px solid #f1f5f9;
    background: #fff;
    flex-shrink: 0;
  }
  @media (max-width: 767px) {
    .wi-mobile-bar { display: flex; }
    .wi-main-inner { padding: 20px 16px 48px; }
  }

  .wi-mobile-menu-btn {
    background: none; border: none; cursor: pointer;
    color: #64748b; padding: 6px; border-radius: 7px;
    display: flex; align-items: center;
    transition: background 0.1s, color 0.1s;
  }
  .wi-mobile-menu-btn:hover { background: #f1f5f9; color: #0a0a0a; }
  .wi-mobile-bar-label { font-size: 13.5px; font-weight: 650; color: #0a0a0a; letter-spacing: -0.2px; }

  /* Toast */
  .wi-toast-wrap {
    position: fixed; top: 68px; left: 50%; transform: translateX(-50%);
    z-index: 200; animation: wiToastIn 0.15s ease;
  }
  @keyframes wiToastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .wi-toast {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 16px; border-radius: 10px;
    font-size: 13px; font-weight: 600; font-family: inherit;
    border: 1.5px solid; white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
  .wi-toast.success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .wi-toast.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .wi-toast-close {
    background: none; border: none; cursor: pointer;
    color: inherit; opacity: 0.5; padding: 0; margin-left: 2px;
    display: flex; align-items: center;
  }
  .wi-toast-close:hover { opacity: 1; }

  /* Overview */
  .wo-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .wo-title { font-size: 24px; font-weight: 800; letter-spacing: -0.6px; color: #0a0a0a; margin: 0 0 4px; }
  .wo-subtitle { font-size: 13.5px; color: #64748b; margin: 0; }
  .wo-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  .wo-icon-btn {
    width: 36px; height: 36px;
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #64748b;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }
  .wo-icon-btn:hover { color: #0a0a0a; border-color: #cbd5e1; background: #f8fafc; }
  .wo-icon-btn.starred { color: #d97706; border-color: #fde68a; background: #fef9f0; }
  .wo-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .wo-new-btn {
    height: 36px; padding: 0 16px;
    background: #0a0a0a; color: #fff;
    border: none; border-radius: 8px;
    font-size: 13px; font-weight: 650;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 6px;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: -0.1px;
  }
  .wo-new-btn:hover { background: #1e293b; }
  .wo-new-btn:active { transform: scale(0.98); }

  /* Stats */
  .wo-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
  @media (max-width: 640px) { .wo-stats { grid-template-columns: 1fr; } }

  .wo-stat {
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 11px;
    padding: 18px 20px; position: relative; overflow: hidden;
  }
  .wo-stat::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0;
    height: 2px; background: linear-gradient(90deg, #2563eb, #60a5fa);
    opacity: 0; transition: opacity 0.2s;
  }
  .wo-stat:hover::before { opacity: 1; }
  .wo-stat-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 8px; }
  .wo-stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.8px; color: #0a0a0a; margin: 0; }

  /* Systems section */
  .wo-systems-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
  .wo-systems-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; }

  .wo-search-wrap { position: relative; }
  .wo-search-input {
    height: 34px; width: 200px; padding: 0 12px 0 34px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 12.5px; font-family: inherit; background: #fff;
    color: #0a0a0a; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .wo-search-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .wo-search-input::placeholder { color: #94a3b8; }
  .wo-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

  /* System rows */
  .wo-system-row {
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
    padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; margin-bottom: 8px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
    position: relative; overflow: hidden;
  }
  .wo-system-row::before {
    content: ''; position: absolute; top: 0; left: 0;
    width: 3px; height: 100%; background: #2563eb;
    opacity: 0; transition: opacity 0.15s;
  }
  .wo-system-row:hover { border-color: #93c5fd; box-shadow: 0 2px 12px rgba(37,99,235,0.07); }
  .wo-system-row:hover::before { opacity: 1; }

  .wo-system-info { flex: 1; min-width: 0; }
  .wo-system-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
  .wo-system-name { font-size: 13.5px; font-weight: 650; color: #0a0a0a; letter-spacing: -0.1px; }
  .wo-system-time { font-size: 12px; color: #94a3b8; }

  .wo-system-badge {
    font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; padding: 2px 7px; border-radius: 4px; border: 1px solid;
  }
  .wo-system-badge.public { background: #ecfdf5; color: #15803d; border-color: #bbf7d0; }
  .wo-system-badge.private { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }

  .wo-system-delete {
    background: none; border: none; cursor: pointer;
    color: #cbd5e1; padding: 6px; border-radius: 7px;
    display: flex; align-items: center;
    transition: color 0.1s, background 0.1s;
    flex-shrink: 0;
  }
  .wo-system-delete:hover { color: #dc2626; background: #fef2f2; }

  /* Empty systems */
  .wo-empty {
    border: 2px dashed #e2e8f0; border-radius: 12px;
    padding: 52px 24px; text-align: center;
    background: #fff;
  }
  .wo-empty-title { font-size: 14px; font-weight: 650; color: #94a3b8; margin: 0 0 16px; }

  /* Public aside */
  .wo-aside {
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px;
    padding: 20px; height: fit-content; position: sticky; top: 24px;
  }
  .wo-aside-title { font-size: 14.5px; font-weight: 750; color: #0a0a0a; margin: 0 0 8px; letter-spacing: -0.3px; }
  .wo-aside-desc { font-size: 13px; color: #64748b; line-height: 1.6; margin: 0; }
  .wo-aside-more-btn {
    background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 650;
    color: #2563eb; display: flex; align-items: center; gap: 4px;
    margin-top: 12px; padding: 0; transition: color 0.1s;
  }
  .wo-aside-more-btn:hover { color: #1d4ed8; }

  .wo-member-pill {
    background: #fafafa; border: 1.5px solid #f1f5f9; border-radius: 8px;
    padding: 8px 12px; margin-top: 8px;
  }
  .wo-member-pill-name { font-size: 13px; font-weight: 600; color: #0a0a0a; }
  .wo-member-pill-role { font-size: 11.5px; color: #94a3b8; margin-top: 1px; }

  /* Delete modal */
  .wi-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,23,42,0.5); backdrop-filter: blur(4px);
    z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .wi-modal {
    background: #fff; border-radius: 14px; border: 1.5px solid #e2e8f0;
    box-shadow: 0 24px 64px rgba(0,0,0,0.14); padding: 28px;
    max-width: 420px; width: 100%; animation: wiModalIn 0.15s ease;
  }
  @keyframes wiModalIn {
    from { opacity: 0; transform: scale(0.97) translateY(4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .wi-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .wi-modal-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 750; color: #0a0a0a; letter-spacing: -0.2px; }
  .wi-modal-title-icon { width: 30px; height: 30px; border-radius: 8px; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #dc2626; }
  .wi-modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; border-radius: 6px; display: flex; align-items: center; transition: color 0.1s; }
  .wi-modal-close:hover { color: #475569; }
  .wi-modal-body { font-size: 13px; color: #64748b; line-height: 1.65; margin-bottom: 18px; }
  .wi-modal-body .danger { color: #dc2626; font-weight: 650; }
  .wi-modal-body strong { color: #0a0a0a; font-weight: 650; }
  .wi-modal-input {
    width: 100%; height: 40px; padding: 0 14px; margin-bottom: 12px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit; color: #0a0a0a; background: #fafafa; outline: none;
    transition: border-color 0.15s;
  }
  .wi-modal-input:focus { border-color: #dc2626; background: #fff; }
  .wi-modal-input::placeholder { color: #cbd5e1; }
  .wi-modal-btn {
    width: 100%; height: 40px; background: #dc2626; color: #fff;
    border: none; border-radius: 8px; font-size: 13.5px; font-weight: 650;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .wi-modal-btn:hover:not(:disabled) { background: #b91c1c; }
  .wi-modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  @keyframes ws-spin { to { transform: rotate(360deg); } }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="wi-toast-wrap">
      <div className={`wi-toast ${type}`}>
        {type === 'success'
          ? <CheckCircle size={15} />
          : <AlertCircle size={15} />}
        {message}
        <button className="wi-toast-close" onClick={onClose}><X size={14} /></button>
      </div>
    </div>
  );
};

// ─── WorkspaceInstance (layout) ───────────────────────────────────────────────
const WorkspaceInstance = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopNavbarCollapsed, setIsDesktopNavbarCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [areWorkspacesLoading, setAreWorkspacesLoading] = useState(true);
  const [starringWorkspaceIds, setStarringWorkspaceIds] = useState([]);
  const isSettingsRoute = location.pathname.includes('/settings');

  const fetchWorkspaces = async () => {
    try {
      const r = await api.get('workspaces/');
      setWorkspaces(r.data);
    } catch (e) {
      console.error("Failed to fetch workspaces", e);
    } finally {
      setAreWorkspacesLoading(false);
    }
  };

  useEffect(() => { fetchWorkspaces(); }, []);

  const toggleWorkspaceStar = async (workspaceId, desiredState) => {
    if (!workspaceId || starringWorkspaceIds.includes(workspaceId)) return null;
    const previousState = !!workspaces.find((w) => w.id === workspaceId)?.is_starred;
    const nextState = typeof desiredState === "boolean" ? desiredState : !previousState;

    setStarringWorkspaceIds((p) => [...p, workspaceId]);
    setWorkspaces((p) => p.map((w) => w.id === workspaceId ? { ...w, is_starred: nextState } : w));

    try {
      const r = await api.patch(`workspaces/${workspaceId}/star/`, { is_starred: nextState });
      const confirmed = typeof r?.data?.is_starred === "boolean" ? r.data.is_starred : nextState;
      setWorkspaces((p) => p.map((w) => w.id === workspaceId ? { ...w, is_starred: confirmed } : w));
      return confirmed;
    } catch (e) {
      setWorkspaces((p) => p.map((w) => w.id === workspaceId ? { ...w, is_starred: previousState } : w));
      throw e;
    } finally {
      setStarringWorkspaceIds((p) => p.filter((id) => id !== workspaceId));
    }
  };

  return (
    <div className="wi-root">
      <style>{styles}</style>
      <AuthenticatedNavbar />

      <div className="wi-mobile-bar md:hidden">
        <button className="wi-mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={20} />
        </button>
        <span className="wi-mobile-bar-label">Workspace</span>
      </div>

      <div className="wi-body">
        <WorkspaceNavbar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          workspaces={workspaces}
          loading={areWorkspacesLoading}
          isDesktopCollapsed={isDesktopNavbarCollapsed}
          onDesktopToggle={() => setIsDesktopNavbarCollapsed((p) => !p)}
          starringWorkspaceIds={starringWorkspaceIds}
          onToggleWorkspaceStar={toggleWorkspaceStar}
        />

        <main className="wi-main">
          <div className={`wi-main-inner${isSettingsRoute ? ' wi-main-inner-wide' : ''}`}>
            <Outlet context={{ refreshWorkspaces: fetchWorkspaces, toggleWorkspaceStar, starringWorkspaceIds }} />
          </div>
        </main>
      </div>
    </div>
  );
};

// ─── WorkspaceOverview ────────────────────────────────────────────────────────
export const WorkspaceOverview = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { toggleWorkspaceStar, starringWorkspaceIds = [] } = useOutletContext() || {};

  const [workspace, setWorkspace] = useState(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemsLoading, setSystemsLoading] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 767 : false
  );
  const [toast, setToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [systemToDelete, setSystemToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreAbout, setShowMoreAbout] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth <= 767);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [wsRes, sysRes] = await Promise.all([
          api.get(`workspaces/${workspaceId}/`),
          api.get(`workspaces/${workspaceId}/canvases/`),
        ]);
        setWorkspace(wsRes.data);
        setSystems(sysRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setSystemsLoading(false);
      }
    };
    fetchAll();
  }, [workspaceId]);

  const showToast = (message, type) => setToast({ message, type });

  const initiateDelete = (system, e) => {
    e.stopPropagation();
    setSystemToDelete(system);
    setDeleteText('');
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!systemToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`workspaces/${workspaceId}/canvases/${systemToDelete.id}/`);
      setSystems((p) => p.filter((s) => s.id !== systemToDelete.id));
      setShowDeleteModal(false);
      setSystemToDelete(null);
      showToast("System deleted successfully", "success");
    } catch {
      showToast("Failed to delete system", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenSystem = (systemId) => {
    if (isMobileViewport) { showToast("System canvas cannot be opened in mobile.", "error"); return; }
    navigate(`/app/ws/${workspaceId}/systems/${systemId}`);
  };

  const handleToggleStar = async () => {
    if (!workspace || !toggleWorkspaceStar) return;
    const prev = !!workspace.is_starred;
    setWorkspace((p) => ({ ...p, is_starred: !prev }));
    try {
      const confirmed = await toggleWorkspaceStar(workspace.id, !prev);
      if (typeof confirmed === "boolean") setWorkspace((p) => ({ ...p, is_starred: confirmed }));
    } catch {
      setWorkspace((p) => ({ ...p, is_starred: prev }));
      showToast("Failed to update star status", "error");
    }
  };

  const formatTimeAgo = (dateString) => {
    const ms = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days === 1) return "1d ago";
    return `${days}d ago`;
  };

  if (loading) return <LoadingState message="Loading workspace" minHeight={420} />;
  if (!workspace) return <div style={{ padding: 40, color: '#dc2626', fontFamily: 'Geist,sans-serif', fontSize: 13 }}>Workspace not found.</div>;

  const isMember = Boolean(workspace.is_member);
  const canStar = isMember || workspace.visibility === "public";
  const filteredSystems = isMember
    ? systems
    : systems.filter((s) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
      });

  const stats = [
    { label: "Total Systems", value: systems.length },
    { label: "Active Evaluations", value: 0 },
    { label: "Team Members", value: workspace.member_count || 1 },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="wi-modal-overlay">
          <div className="wi-modal">
            <div className="wi-modal-head">
              <div className="wi-modal-title">
                <div className="wi-modal-title-icon"><Trash2 size={15} /></div>
                Delete System
              </div>
              <button className="wi-modal-close" onClick={() => setShowDeleteModal(false)}><X size={16} /></button>
            </div>
            <div className="wi-modal-body">
              This will permanently delete <strong>{systemToDelete?.name}</strong> and all associated data.
              This action <span className="danger">cannot be undone</span>.<br /><br />
              Type <strong>delete system</strong> to confirm.
            </div>
            <input
              className="wi-modal-input"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="delete system"
              autoFocus
            />
            <button
              className="wi-modal-btn"
              onClick={executeDelete}
              disabled={deleteText !== 'delete system' || deleting}
            >
              {deleting ? "Deleting…" : "Delete System Permanently"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="wo-header">
        <div>
          <h1 className="wo-title">{workspace.name}</h1>
          <p className="wo-subtitle">{workspace.description || "Overview of your systems and evaluations."}</p>
        </div>
        <div className="wo-actions">
          {canStar && (
            <button
              className={`wo-icon-btn ${workspace.is_starred ? 'starred' : ''}`}
              onClick={handleToggleStar}
              disabled={starringWorkspaceIds.includes(workspace.id)}
              title={workspace.is_starred ? "Unstar" : "Star workspace"}
            >
              <Star size={17} style={workspace.is_starred ? { fill: '#d97706', stroke: '#d97706' } : {}} />
            </button>
          )}
          {isMember && (
            <button
              className="wo-icon-btn"
              onClick={() => navigate(`/app/ws/${workspaceId}/settings`)}
              title="Settings"
            >
              <Settings size={17} />
            </button>
          )}
          {workspace.is_admin && (
            <button className="wo-new-btn" onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)}>
              <Plus size={15} />
              New System
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="wo-stats">
        {stats.map((s, i) => (
          <div key={i} className="wo-stat">
            <p className="wo-stat-label">{s.label}</p>
            <p className="wo-stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Systems + optional aside */}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: isMember ? '1fr' : 'minmax(0,1fr) 300px' }}>
        <div>
          <div className="wo-systems-head">
            <span className="wo-systems-title">Systems</span>
            {!isMember && (
              <div className="wo-search-wrap">
                <Search size={13} className="wo-search-icon" />
                <input
                  className="wo-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search systems…"
                />
              </div>
            )}
          </div>

          {systemsLoading ? (
            <LoadingState message="Loading systems" minHeight={260} imageWidth={140} />
          ) : filteredSystems.length > 0 ? (
            filteredSystems.map((sys) => (
              <div key={sys.id} className="wo-system-row" onClick={() => handleOpenSystem(sys.id)}>
                <div className="wo-system-info">
                  <div className="wo-system-name-row">
                    <span className="wo-system-name">{sys.name}</span>
                    <span className={`wo-system-badge ${sys.visibility === 'public' ? 'public' : 'private'}`}>
                      {sys.visibility}
                    </span>
                  </div>
                  <span className="wo-system-time">Updated {formatTimeAgo(sys.updated_at)}</span>
                </div>
                {workspace.is_admin && (
                  <button className="wo-system-delete" onClick={(e) => initiateDelete(sys, e)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="wo-empty">
              <p className="wo-empty-title">{isMember ? "No systems yet" : "No public systems found"}</p>
              {workspace.is_admin ? (
                <button className="wo-new-btn" style={{ margin: '0 auto' }} onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)}>
                  <Plus size={15} /> Create Your First System
                </button>
              ) : (
                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                  {isMember ? "Ask a workspace admin to create a system." : "Try a different search."}
                </p>
              )}
            </div>
          )}
        </div>

        {!isMember && (
          <aside className="wo-aside">
            <h3 className="wo-aside-title">{workspace.name}</h3>
            <p className="wo-aside-desc">{workspace.description || "No description provided."}</p>
            <button className="wo-aside-more-btn" onClick={() => setShowMoreAbout((p) => !p)}>
              {showMoreAbout ? 'Less' : 'More'}
              {showMoreAbout ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMoreAbout && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1.5px solid #f1f5f9' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Users size={12} /> Team Members
                </div>
                {(workspace.team_members || []).map((m, i) => (
                  <div key={`${m.full_name}-${i}`} className="wo-member-pill">
                    <div className="wo-member-pill-name">{m.full_name}</div>
                    <div className="wo-member-pill-role">{m.role}</div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default WorkspaceInstance;
