import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, X, Star } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');

  .wsnav-root {
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* ── Desktop sidebar ── */
  .wsnav-desktop {
    height: 100%;
    background: #fff;
    display: flex;
    flex-direction: column;
    transition: width 0.25s ease, opacity 0.2s ease, transform 0.25s ease;
    overflow: hidden;
    border-right: 1.5px solid #f1f5f9;
  }
  .wsnav-desktop.expanded { width: 236px; opacity: 1; }
  .wsnav-desktop.collapsed { width: 0; opacity: 0; pointer-events: none; border-right: none; transform: translateX(-8px); }

  /* ── Collapse strip ── */
  .wsnav-collapsed-strip {
    width: 44px;
    flex-shrink: 0;
    border-right: 1.5px solid #f1f5f9;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0;
    gap: 8px;
  }

  .wsnav-expand-btn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid #e2e8f0; border-radius: 7px;
    background: #fff; color: #64748b; cursor: pointer;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }
  .wsnav-expand-btn:hover { color: #0a0a0a; border-color: #cbd5e1; background: #f8fafc; }

  /* ── Header ── */
  .wsnav-header {
    padding: 12px 14px;
    border-bottom: 1.5px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .wsnav-header-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .wsnav-header-btns { display: flex; align-items: center; gap: 2px; }

  .wsnav-icon-btn {
    background: none; border: none; cursor: pointer;
    color: #94a3b8; padding: 5px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.1s, background 0.1s;
  }
  .wsnav-icon-btn:hover { color: #475569; background: #f1f5f9; }

  /* ── Items list ── */
  .wsnav-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .wsnav-list::-webkit-scrollbar { width: 4px; }
  .wsnav-list::-webkit-scrollbar-track { background: transparent; }
  .wsnav-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

  .wsnav-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 10px;
    border-radius: 9px;
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    margin-bottom: 2px;
    background: none;
    text-align: left;
    font-family: inherit;
  }
  .wsnav-item:hover { background: #f8fafc; border-color: #f1f5f9; }

  .wsnav-item-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }

  .wsnav-item-name {
    font-size: 13px; font-weight: 650;
    color: #1e293b; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    letter-spacing: -0.1px;
  }

  .wsnav-item-meta {
    font-size: 11px; color: #94a3b8;
    font-weight: 500; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  .wsnav-item-right {
    display: flex; align-items: center; gap: 2px;
    flex-shrink: 0; margin-left: 6px;
  }

  .wsnav-star-btn {
    background: none; border: none;
    cursor: pointer; padding: 4px;
    border-radius: 5px; color: #cbd5e1;
    display: flex; align-items: center;
    transition: color 0.1s, background 0.1s;
  }
  .wsnav-star-btn:hover { color: #d97706; background: #fef9f0; }
  .wsnav-star-btn.active { color: #d97706; }
  .wsnav-star-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .wsnav-chevron { color: #cbd5e1; transition: color 0.1s; }
  .wsnav-item:hover .wsnav-chevron { color: #94a3b8; }

  /* ── Loading ── */
  .wsnav-loading {
    padding: 16px 12px;
    font-size: 12px; color: #94a3b8; font-weight: 500;
  }

  /* ── Footer ── */
  .wsnav-footer {
    padding: 10px;
    border-top: 1.5px solid #f1f5f9;
    flex-shrink: 0;
  }

  .wsnav-create-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center;
    gap: 7px; padding: 9px 12px;
    border: 1.5px dashed #e2e8f0; border-radius: 9px;
    background: none; cursor: pointer;
    font-size: 12.5px; font-weight: 600;
    color: #64748b; font-family: inherit;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .wsnav-create-btn:hover {
    border-color: #93c5fd;
    color: #2563eb;
    background: #f0f7ff;
  }

  /* ── Mobile overlay ── */
  .wsnav-mobile-overlay {
    display: none;
    position: fixed; inset: 0;
    z-index: 50;
  }
  .wsnav-mobile-overlay.open { display: block; }

  .wsnav-mobile-backdrop {
    position: absolute; inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .wsnav-mobile-drawer {
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 280px;
    background: #fff;
    box-shadow: 0 0 40px rgba(0,0,0,0.12);
    display: flex; flex-direction: column;
    animation: wsDrawerIn 0.2s ease;
  }
  @keyframes wsDrawerIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @media (min-width: 768px) {
    .wsnav-mobile-overlay { display: none !important; }
  }
`;

export default function WorkspaceNavbar({
  isOpen,
  onClose,
  workspaces = [],
  loading = false,
  isDesktopCollapsed = false,
  onDesktopToggle,
  starringWorkspaceIds = [],
  onToggleWorkspaceStar,
}) {
  const navigate = useNavigate();

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (a.is_starred !== b.is_starred) return Number(b.is_starred) - Number(a.is_starred);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const NavContent = ({ onItemClick }) => (
    <>
      <div className="wsnav-header">
        <span className="wsnav-header-label">Workspaces</span>
        <div className="wsnav-header-btns">
          <button
            className="wsnav-icon-btn"
            onClick={onDesktopToggle}
            title="Collapse sidebar"
            style={{ display: onItemClick ? 'none' : undefined }}
          >
            <ChevronLeft size={15} />
          </button>
          {onItemClick && (
            <button className="wsnav-icon-btn" onClick={onItemClick} title="Close">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="wsnav-list">
        {loading ? (
          <div className="wsnav-loading">Loading workspaces…</div>
        ) : (
          sortedWorkspaces.map((ws) => (
            <div
              key={ws.id}
              className="wsnav-item"
              role="button"
              tabIndex={0}
              onClick={() => { navigate(`/app/ws/${ws.id}`); if (onItemClick) onItemClick(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/app/ws/${ws.id}`);
                  if (onItemClick) onItemClick();
                }
              }}
            >
              <div className="wsnav-item-left">
                <span className="wsnav-item-name">{ws.name}</span>
                <span className="wsnav-item-meta">
                  {ws.member_count} {ws.member_count === 1 ? 'member' : 'members'} · {ws.visibility}
                </span>
              </div>
              <div className="wsnav-item-right">
                <button
                  type="button"
                  className={`wsnav-star-btn ${ws.is_starred ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleWorkspaceStar) onToggleWorkspaceStar(ws.id, !ws.is_starred);
                  }}
                  aria-label={ws.is_starred ? 'Unstar' : 'Star'}
                  disabled={starringWorkspaceIds.includes(ws.id)}
                >
                  <Star
                    size={13}
                    style={ws.is_starred ? { fill: '#d97706', stroke: '#d97706' } : {}}
                  />
                </button>
                <ChevronRight size={13} className="wsnav-chevron" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="wsnav-footer">
        <button
          className="wsnav-create-btn"
          onClick={() => { navigate('/app/create-workspace'); if (onItemClick) onItemClick(); }}
        >
          <Plus size={14} />
          New workspace
        </button>
      </div>
    </>
  );

  return (
    <div className="wsnav-root" style={{ display: 'contents' }}>
      <style>{styles}</style>

      {/* Desktop sidebar */}
      <div className={`wsnav-desktop ${isDesktopCollapsed ? 'collapsed' : 'expanded'} hidden md:flex md:flex-col`}>
        <NavContent />
      </div>

      {/* Collapsed expand strip */}
      {isDesktopCollapsed && (
        <div className="wsnav-collapsed-strip hidden md:flex">
          <button
            className="wsnav-expand-btn"
            onClick={onDesktopToggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      <div className={`wsnav-mobile-overlay ${isOpen ? 'open' : ''} md:hidden`}>
        <div className="wsnav-mobile-backdrop" onClick={onClose} />
        <div className="wsnav-mobile-drawer">
          <NavContent onItemClick={onClose} />
        </div>
      </div>
    </div>
  );
}