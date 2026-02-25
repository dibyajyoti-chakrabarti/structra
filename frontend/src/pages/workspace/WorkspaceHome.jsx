import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, Users, Clock, Star, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import api from '../../api';
import LoadingState from '../../components/LoadingState';

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

  .wsh-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text);
  }

  .wsh-main {
    max-width: 1160px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  /* ── Search ── */
  .wsh-search-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 22px;
  }

  .wsh-search-wrap {
    position: relative;
    flex: 1;
  }

  .wsh-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-subtle);
  }

  .wsh-search-input {
    width: 100%;
    height: 40px;
    padding: 0 14px 0 36px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 13.5px;
    font-family: inherit;
    background: var(--surface);
    color: var(--text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .wsh-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .wsh-search-input::placeholder { color: var(--text-subtle); }

  /* ── Loading ── */
  .wsh-loading {
    min-height: 100vh;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Geist', sans-serif;
  }

  .wsh-loading-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .wsh-loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: wsh-spin 0.7s linear infinite;
  }

  @keyframes wsh-spin {
    to { transform: rotate(360deg); }
  }

  .wsh-loading-text {
    font-size: 13.5px;
    color: var(--text-subtle);
    font-weight: 500;
  }

  /* ── Section header row ── */
  .wsh-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .wsh-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wsh-section-title svg { color: var(--text-subtle); }

  .wsh-count-pill {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--warning);
    background: color-mix(in srgb, var(--warning), transparent 80%);
    border: 1px solid color-mix(in srgb, var(--warning), transparent 60%);
    padding: 3px 8px;
    border-radius: 20px;
  }

  /* ── Empty state ── */
  .wsh-empty {
    border: 1.5px dashed var(--border);
    border-radius: 12px;
    padding: 24px 20px;
    font-size: 13px;
    color: var(--text-subtle);
    line-height: 1.6;
    background: var(--surface);
  }

  /* ── Grid ── */
  .wsh-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  /* ── Starred card ── */
  .wsh-card-starred {
    background: var(--surface);
    border: 1.5px solid color-mix(in srgb, var(--warning), transparent 60%);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    position: relative;
    overflow: hidden;
  }

  .wsh-card-starred::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--warning), color-mix(in srgb, var(--warning), #fff 25%));
    opacity: 0;
    transition: opacity 0.15s;
  }

  .wsh-card-starred:hover {
    border-color: var(--warning);
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.12);
    transform: translateY(-1px);
  }

  .wsh-card-starred:hover::before { opacity: 1; }

  .wsh-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .wsh-card-icon-starred {
    width: 36px;
    height: 36px;
    background: color-mix(in srgb, var(--warning), transparent 80%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--warning);
  }

  .wsh-unstar-btn {
    background: none;
    border: 1.5px solid color-mix(in srgb, var(--warning), transparent 60%);
    border-radius: 7px;
    padding: 5px;
    cursor: pointer;
    color: var(--warning);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.1s, background 0.1s;
    opacity: 0.6;
  }

  .wsh-unstar-btn:not(:disabled):hover {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning), transparent 80%);
    opacity: 1;
  }

  .wsh-unstar-btn:disabled { cursor: not-allowed; opacity: 0.35; }

  /* ── Regular workspace card ── */
  .wsh-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    position: relative;
    overflow: hidden;
  }

  .wsh-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    opacity: 0;
    transition: opacity 0.15s;
  }

  .wsh-card:hover {
    border-color: var(--accent-2);
    box-shadow: 0 4px 20px rgba(37, 99, 235, 0.08);
    transform: translateY(-1px);
  }

  .wsh-card:hover::before { opacity: 1; }

  .wsh-card-icon {
    width: 36px;
    height: 36px;
    background: var(--accent-soft);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    transition: background 0.15s, color 0.15s;
  }

  .wsh-card:hover .wsh-card-icon {
    background: var(--accent);
    color: #fff;
  }

  .wsh-card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .wsh-star-btn {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 7px;
    padding: 5px;
    cursor: pointer;
    color: var(--text-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }

  .wsh-star-btn:not(:disabled):hover {
    color: var(--warning);
    border-color: color-mix(in srgb, var(--warning), transparent 60%);
    background: color-mix(in srgb, var(--warning), transparent 85%);
  }

  .wsh-star-btn.active {
    color: var(--warning);
    border-color: color-mix(in srgb, var(--warning), transparent 60%);
  }

  .wsh-star-btn:disabled { cursor: not-allowed; opacity: 0.4; }

  .wsh-vis-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 3px 7px;
    border-radius: 5px;
  }

  /* ── Card body ── */
  .wsh-card-name {
    font-size: 14.5px;
    font-weight: 650;
    color: var(--text);
    margin: 0 0 4px;
    letter-spacing: -0.2px;
    transition: color 0.15s;
  }

  .wsh-card:hover .wsh-card-name { color: var(--accent); }

  .wsh-card-meta {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 12.5px;
    color: var(--text-subtle);
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }

  .wsh-card-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* ── Page header ── */
  .wsh-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .wsh-page-title {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.7px;
    color: var(--text);
    margin: 0 0 4px;
    line-height: 1.15;
  }

  .wsh-page-subtitle {
    font-size: 13.5px;
    color: var(--text-muted);
    margin: 0;
    font-weight: 400;
  }

  .wsh-create-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--text);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: -0.1px;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .wsh-create-btn:hover { background: color-mix(in srgb, var(--text), #000 12%); }
  .wsh-create-btn:active { transform: scale(0.98); }

  /* ── Add new card ── */
  .wsh-card-new {
    border: 1.5px dashed var(--border-strong);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.1s;
    min-height: 148px;
    background: var(--surface);
    width: 100%;
    font-family: inherit;
    gap: 10px;
    box-shadow: inset 0 0 0 1px var(--border);
  }

  .wsh-card-new:hover {
    border-color: var(--accent-2);
    background: var(--accent-soft);
    box-shadow: inset 0 0 0 1px var(--accent-2), 0 8px 24px rgba(37, 99, 235, 0.08);
    transform: translateY(-1px);
  }

  .wsh-card-new-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--surface-3);
    border: 1.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .wsh-card-new:hover .wsh-card-new-icon {
    background: color-mix(in srgb, var(--accent), transparent 75%);
    color: var(--accent);
    border-color: var(--accent-2);
  }

  .wsh-card-new-label {
    font-size: 13.5px;
    font-weight: 650;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .wsh-card-new:hover .wsh-card-new-label { color: var(--accent); }

  /* ── Section spacing ── */
  .wsh-section {
    margin-bottom: 44px;
  }

  @media (max-width: 640px) {
    .wsh-main { padding: 24px 16px 60px; }
    .wsh-page-title { font-size: 22px; }
    .wsh-create-btn span { display: none; }
    .wsh-search-input { height: 38px; }
  }
`;

// ─── Card components ─────────────────────────────────────────────────────────
const StarredCard = ({ ws, onUnstar, isStarring, onClick }) => (
  <div className="wsh-card-starred" onClick={onClick}>
    <div className="wsh-card-top">
      <div className="wsh-card-icon-starred">
        <Star size={18} style={{ fill: '#fbbf24', stroke: '#d97706' }} />
      </div>
      <button
        type="button"
        aria-label="Unstar workspace"
        className="wsh-unstar-btn"
        onClick={(e) => { e.stopPropagation(); onUnstar(); }}
        disabled={isStarring}
      >
        <Star size={14} style={{ fill: '#d97706' }} />
      </button>
    </div>
    <h3 className="wsh-card-name">{ws.name}</h3>
    <div className="wsh-card-meta">
      <div className="wsh-card-meta-item">
        <Users size={13} />
        <span>{ws.member_count} {ws.member_count === 1 ? 'member' : 'members'}</span>
      </div>
      <div className="wsh-card-meta-item">
        <Clock size={13} />
        <span>{formatDistanceToNow(new Date(ws.updated_at), { addSuffix: true })}</span>
      </div>
    </div>
  </div>
);

const WorkspaceCard = ({ ws, onToggleStar, isStarring, onClick }) => (
  <div className="wsh-card" onClick={onClick}>
    <div className="wsh-card-top">
      <div className="wsh-card-icon">
        <Layout size={18} />
      </div>
      <div className="wsh-card-actions">
        <button
          type="button"
          aria-label={ws.is_starred ? 'Unstar workspace' : 'Star workspace'}
          className={`wsh-star-btn ${ws.is_starred ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
          disabled={isStarring}
        >
          <Star
            size={14}
            style={ws.is_starred ? { fill: '#d97706', stroke: '#d97706' } : {}}
          />
        </button>
        <span className="wsh-vis-badge">{ws.visibility}</span>
      </div>
    </div>
    <h3 className="wsh-card-name">{ws.name}</h3>
    <div className="wsh-card-meta">
      <div className="wsh-card-meta-item">
        <Users size={13} />
        <span>{ws.member_count} {ws.member_count === 1 ? 'member' : 'members'}</span>
      </div>
      <div className="wsh-card-meta-item">
        <Clock size={13} />
        <span>{formatDistanceToNow(new Date(ws.updated_at), { addSuffix: true })}</span>
      </div>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const WorkspaceHome = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [starredWorkspaces, setStarredWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starringWorkspaceIds, setStarringWorkspaceIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const [workspaceResponse, starredResponse] = await Promise.all([
          api.get('workspaces/'),
          api.get('workspaces/starred/'),
        ]);
        setWorkspaces(workspaceResponse.data);
        setStarredWorkspaces(starredResponse.data);
      } catch (error) {
        console.error('Failed to fetch workspaces', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const toggleWorkspaceStar = async (workspaceId, nextState) => {
    if (!workspaceId) return;
    if (starringWorkspaceIds.includes(workspaceId)) return;

    const workspaceFromState =
      workspaces.find((w) => w.id === workspaceId) ||
      starredWorkspaces.find((w) => w.id === workspaceId);
    const previousState = !!workspaceFromState?.is_starred;

    setStarringWorkspaceIds((prev) => [...prev, workspaceId]);
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === workspaceId ? { ...w, is_starred: nextState } : w))
    );

    if (workspaceFromState) {
      if (nextState) {
        setStarredWorkspaces((prev) => {
          if (prev.some((w) => w.id === workspaceId)) {
            return prev.map((w) => (w.id === workspaceId ? { ...w, is_starred: true } : w));
          }
          return [{ ...workspaceFromState, is_starred: true }, ...prev];
        });
      } else {
        setStarredWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
      }
    }

    try {
      const response = await api.patch(`workspaces/${workspaceId}/star/`, { is_starred: nextState });
      const confirmed =
        typeof response?.data?.is_starred === 'boolean' ? response.data.is_starred : nextState;

      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, is_starred: confirmed } : w))
      );
      if (!confirmed) {
        setStarredWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
      }
    } catch {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, is_starred: previousState } : w))
      );
      if (workspaceFromState) {
        if (previousState) {
          setStarredWorkspaces((prev) => {
            if (prev.some((w) => w.id === workspaceId)) return prev;
            return [{ ...workspaceFromState, is_starred: true }, ...prev];
          });
        } else {
          setStarredWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
        }
      }
    } finally {
      setStarringWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (a.is_starred !== b.is_starred) return Number(b.is_starred) - Number(a.is_starred);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const sortedStarred = [...starredWorkspaces].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const filteredWorkspaces = normalizedQuery
    ? sortedWorkspaces.filter((ws) => ws.name.toLowerCase().includes(normalizedQuery))
    : sortedWorkspaces;

  const filteredStarred = normalizedQuery
    ? sortedStarred.filter((ws) => ws.name.toLowerCase().includes(normalizedQuery))
    : sortedStarred;

  if (loading) {
    return (
      <div className="wsh-loading">
        <style>{styles}</style>
        <LoadingState message="Loading workspaces" minHeight={360} />
      </div>
    );
  }

  return (
    <div className="wsh-root">
      <style>{styles}</style>
      <AuthenticatedNavbar />

      <main className="wsh-main">
        <div className="wsh-search-row">
          <div className="wsh-search-wrap">
            <Search size={16} className="wsh-search-icon" />
            <input
              type="text"
              className="wsh-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              aria-label="Search workspaces"
            />
          </div>
        </div>

        {/* Starred section */}
        <section className="wsh-section">
          <div className="wsh-section-head">
            <span className="wsh-section-title">
              <Star size={14} />
              Starred
            </span>
            {filteredStarred.length > 0 && (
              <span className="wsh-count-pill">{filteredStarred.length} starred</span>
            )}
          </div>

          {filteredStarred.length === 0 ? (
            <div className="wsh-empty">
              {normalizedQuery
                ? 'No starred workspaces match your search.'
                : 'No starred workspaces yet. Star any workspace to pin it here for quick access.'}
            </div>
          ) : (
            <div className="wsh-grid">
              {filteredStarred.map((ws) => (
                <StarredCard
                  key={`starred-${ws.id}`}
                  ws={ws}
                  onUnstar={() => toggleWorkspaceStar(ws.id, false)}
                  isStarring={starringWorkspaceIds.includes(ws.id)}
                  onClick={() => navigate(`/app/ws/${ws.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* My Workspaces section */}
        <div className="wsh-page-head">
          <div>
            <h1 className="wsh-page-title">My Workspaces</h1>
            <p className="wsh-page-subtitle">Manage your projects and team environments.</p>
          </div>
          <button className="wsh-create-btn" onClick={() => navigate('/app/create-workspace')}>
            <Plus size={16} />
            <span>New Workspace</span>
          </button>
        </div>

        <div className="wsh-grid">
          {filteredWorkspaces.length === 0 && (
            <div className="wsh-empty">
              {normalizedQuery ? 'No workspaces match your search.' : 'No workspaces found.'}
            </div>
          )}

          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              onToggleStar={() => toggleWorkspaceStar(ws.id, !ws.is_starred)}
              isStarring={starringWorkspaceIds.includes(ws.id)}
              onClick={() => navigate(`/app/ws/${ws.id}`)}
            />
          ))}

          <button
            className="wsh-card-new"
            onClick={() => navigate('/app/create-workspace')}
          >
            <div className="wsh-card-new-icon">
              <Plus size={18} />
            </div>
            <span className="wsh-card-new-label">New workspace</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceHome;
