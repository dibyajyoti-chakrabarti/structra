import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  UserPlus, CheckCircle, Search, Circle,
  AlertCircle, ShieldAlert, ChevronDown, Plus, X,
} from "lucide-react";
import api from "../../api";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "commenter", label: "Commenter" },
  { value: "editor", label: "Editor" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

  .cs-root {
    display: flex; flex-direction: column;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  @media (min-width: 900px) {
    .cs-root { flex-direction: row; min-height: calc(100vh - 180px); }
  }

  /* ── Left panel ── */
  .cs-left {
    flex: 1; display: flex; flex-direction: column;
    padding-right: 0; padding-bottom: 24px;
  }
  @media (min-width: 900px) {
    .cs-left { padding-right: 36px; padding-bottom: 0; border-right: 1.5px solid #f1f5f9; }
  }

  .cs-panel-title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #0a0a0a; margin: 0 0 6px; }
  .cs-panel-sub { font-size: 13px; color: #64748b; margin: 0 0 28px; }

  /* Alerts */
  .cs-alert {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: 10px; border: 1.5px solid;
    margin-bottom: 20px; font-size: 13px;
    animation: csAlertIn 0.15s ease;
  }
  @keyframes csAlertIn { from { opacity:0; transform: translateY(-3px); } to { opacity:1; transform: translateY(0); } }
  .cs-alert.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
  .cs-alert.warning { background: #fef9c3; border-color: #fde68a; color: #854d0e; }
  .cs-alert-title { font-weight: 700; margin-bottom: 2px; }
  .cs-alert-body { color: inherit; opacity: 0.85; }

  /* Fields */
  .cs-field { margin-bottom: 22px; }
  .cs-label {
    display: block; font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: #64748b; margin-bottom: 8px;
  }
  .cs-label .required { color: #ef4444; margin-left: 3px; }

  .cs-input {
    width: 100%; height: 40px; padding: 0 14px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit;
    color: #0a0a0a; background: #fafafa; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .cs-input:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .cs-input::placeholder { color: #94a3b8; }
  .cs-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

  .cs-textarea {
    width: 100%; padding: 10px 14px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit; color: #0a0a0a;
    background: #fafafa; outline: none; resize: none; line-height: 1.55;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .cs-textarea:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .cs-textarea:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

  .cs-select-wrap { position: relative; }
  .cs-select {
    width: 100%; height: 40px; padding: 0 36px 0 14px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit; color: #1e293b;
    background: #fafafa; outline: none; appearance: none; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .cs-select:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .cs-select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
  .cs-select-icon { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .cs-select-note { font-size: 12px; color: #b45309; margin-top: 5px; }

  /* Actions */
  .cs-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 24px; margin-top: auto; border-top: 1.5px solid #f1f5f9; }
  .cs-cancel-btn {
    height: 38px; padding: 0 16px;
    background: none; border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-weight: 500; color: #64748b;
    cursor: pointer; font-family: inherit;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
  }
  .cs-cancel-btn:hover { border-color: #cbd5e1; color: #1e293b; background: #f8fafc; }
  .cs-cancel-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .cs-submit-btn {
    height: 38px; padding: 0 20px;
    background: #0a0a0a; color: #fff; border: none; border-radius: 8px;
    font-size: 13.5px; font-weight: 650; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 7px;
    transition: background 0.15s, transform 0.1s;
  }
  .cs-submit-btn:hover { background: #1e293b; }
  .cs-submit-btn:active { transform: scale(0.98); }
  .cs-submit-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; transform: none; }

  /* ── Right panel (team access) ── */
  .cs-right {
    width: 100%; display: flex; flex-direction: column;
    border-top: 1.5px solid #f1f5f9; padding-top: 24px;
  }
  @media (min-width: 900px) {
    .cs-right { width: 300px; flex-shrink: 0; padding-left: 36px; padding-top: 0; border-top: none; }
  }

  .cs-right-title { font-size: 14px; font-weight: 700; color: #0a0a0a; margin: 0 0 3px; display: flex; align-items: center; gap: 8px; letter-spacing: -0.2px; }
  .cs-right-title svg { color: #2563eb; }
  .cs-right-sub { font-size: 12.5px; color: #94a3b8; margin: 0 0 14px; }

  /* Search */
  .cs-member-search-wrap { position: relative; margin-bottom: 10px; }
  .cs-member-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .cs-member-search {
    width: 100%; height: 36px; padding: 0 14px 0 32px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-family: inherit; background: #fafafa;
    color: #0a0a0a; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .cs-member-search:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .cs-member-search::placeholder { color: #94a3b8; }
  .cs-member-search:disabled { background: #f1f5f9; cursor: not-allowed; }

  /* Member list */
  .cs-member-list-wrap {
    flex: 1; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 11px; overflow: hidden;
    display: flex; flex-direction: column; min-height: 200px;
  }
  .cs-member-list-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-bottom: 1.5px solid #f1f5f9; background: #fafafa;
  }
  .cs-member-list-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; }
  .cs-selected-count { font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 20px; }

  .cs-member-list { flex: 1; overflow-y: auto; padding: 8px; }
  .cs-member-list::-webkit-scrollbar { width: 4px; }
  .cs-member-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

  .cs-member-empty { text-align: center; padding: 24px 12px; font-size: 12.5px; color: #94a3b8; }

  .cs-member-item {
    border-radius: 9px; border: 1.5px solid #f1f5f9;
    margin-bottom: 6px; overflow: hidden;
    transition: border-color 0.15s;
  }
  .cs-member-item:last-child { margin-bottom: 0; }
  .cs-member-item.selected { border-color: #bfdbfe; background: #f0f7ff; }

  .cs-member-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 10px; cursor: pointer;
  }
  .cs-member-row.disabled { cursor: not-allowed; }
  .cs-member-left { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .cs-member-avatar {
    width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; flex-shrink: 0;
  }
  .cs-member-avatar.idle { background: #f1f5f9; color: #64748b; }
  .cs-member-avatar.active { background: #dbeafe; color: #1d4ed8; }
  .cs-member-name { font-size: 13px; font-weight: 650; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.1px; }
  .cs-member-email { font-size: 11.5px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Role selector inline */
  .cs-member-role { padding: 8px 10px 10px 10px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
  .cs-member-role-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 5px; }
  .cs-member-role-select {
    width: 100%; height: 32px; padding: 0 28px 0 10px;
    border: 1.5px solid #e2e8f0; border-radius: 6px;
    font-size: 12.5px; font-family: inherit; color: #1e293b;
    background: #fff; outline: none; appearance: none; cursor: pointer;
    transition: border-color 0.15s;
  }
  .cs-member-role-select:focus { border-color: #2563eb; }

  @keyframes cs-spin { to { transform: rotate(360deg); } }
`;

const CreateSystem = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const [systemName, setSystemName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [workspaceVisibility, setWorkspaceVisibility] = useState("private");
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingMembers(true);
      try {
        const [wsR, mR, pR] = await Promise.all([
          api.get(`workspaces/${workspaceId}/`),
          api.get(`workspaces/${workspaceId}/members/`),
          api.get("auth/profile/"),
        ]);
        const parentVis = wsR.data?.visibility || "private";
        setWorkspaceVisibility(parentVis);
        setVisibility("private");
        setIsAdmin(!!wsR.data?.is_admin);
        const uid = pR.data?.user_id || "";
        setCurrentUserId(uid);
        setWorkspaceMembers((mR.data || []).filter((m) => m.user_id !== uid));
      } catch (e) {
        setError(e.response?.data?.error || "Failed to load workspace members.");
      } finally { setLoadingMembers(false); }
    };
    fetchData();
  }, [workspaceId]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = workspaceMembers.filter((m) => m.user_id !== currentUserId);
    if (!q) return list;
    return list.filter(
      (m) => (m.full_name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)
    );
  }, [workspaceMembers, searchQuery, currentUserId]);

  const toggleMember = (userId) => {
    setSelectedMembers((p) => {
      const n = { ...p };
      if (n[userId]) delete n[userId]; else n[userId] = "viewer";
      return n;
    });
  };

  const updateRole = (userId, role) => setSelectedMembers((p) => ({ ...p, [userId]: role }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) { setError("Only workspace admins can create systems."); return; }
    if (!systemName.trim()) { setError("System name is required."); return; }
    setLoading(true); setError(null);
    try {
      const payload = {
        name: systemName.trim(),
        description: description.trim(),
        visibility: workspaceVisibility === "private" ? "private" : visibility,
        member_permissions: Object.entries(selectedMembers).map(([user_id, role]) => ({ user_id, role })),
      };
      await api.post(`workspaces/${workspaceId}/canvases/`, payload);
      navigate(`/app/ws/${workspaceId}`);
    } catch (e) {
      const d = e.response?.data;
      if (d?.name) setError(`Name: ${d.name[0]}`);
      else if (d?.visibility) setError(Array.isArray(d.visibility) ? d.visibility[0] : d.visibility);
      else if (d?.detail) setError(d.detail);
      else if (d?.error) setError(d.error);
      else setError("Failed to create system. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <style>{styles}</style>
      <div className="cs-root">
        {/* ── Left ── */}
        <div className="cs-left">
          <h1 className="cs-panel-title">Create a system</h1>
          <p className="cs-panel-sub">Configure the core parameters for your system model.</p>

          {error && (
            <div className="cs-alert error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="cs-alert-title">Error</div>
                <div className="cs-alert-body">{error}</div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, marginLeft: 'auto', display: 'flex', alignItems: 'center' }} onClick={() => setError(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {!loadingMembers && !isAdmin && (
            <div className="cs-alert warning">
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="cs-alert-title">Admin Access Required</div>
                <div className="cs-alert-body">Only workspace admins can create systems.</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="cs-field">
              <label className="cs-label">System Name <span className="required">*</span></label>
              <input
                className="cs-input"
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="e.g. Neural Link Architecture"
                disabled={loading || !isAdmin}
              />
            </div>

            <div className="cs-field">
              <label className="cs-label">Operational Description</label>
              <textarea
                className="cs-textarea"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the system's objective and scope…"
                disabled={loading || !isAdmin}
              />
            </div>

            <div className="cs-field">
              <label className="cs-label">Visibility</label>
              <div className="cs-select-wrap">
                <select
                  className="cs-select"
                  value={workspaceVisibility === "private" ? "private" : visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  disabled={loading || !isAdmin || workspaceVisibility === "private"}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
                <ChevronDown size={14} className="cs-select-icon" />
              </div>
              {workspaceVisibility === "private" && (
                <div className="cs-select-note">Systems must be private within a private workspace.</div>
              )}
            </div>

            <div className="cs-actions">
              <button type="button" className="cs-cancel-btn" onClick={() => navigate(`/app/ws/${workspaceId}`)} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="cs-submit-btn" disabled={loading || !systemName.trim() || !isAdmin}>
                {loading ? (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'cs-spin 0.7s linear infinite', display: 'inline-block' }} />
                    Creating…
                  </>
                ) : (
                  <><Plus size={15} /> Save System</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right ── */}
        <div className="cs-right">
          <h3 className="cs-right-title"><UserPlus size={15} /> Team Access</h3>
          <p className="cs-right-sub">Select members and assign roles for initial system access.</p>

          <div className="cs-member-search-wrap">
            <Search size={13} className="cs-member-search-icon" />
            <input
              className="cs-member-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find member by name or email…"
              disabled={loadingMembers || !isAdmin}
            />
          </div>

          <div className="cs-member-list-wrap">
            <div className="cs-member-list-head">
              <span className="cs-member-list-label">Workspace Members</span>
              <span className="cs-selected-count">{Object.keys(selectedMembers).length} Selected</span>
            </div>
            <div className="cs-member-list">
              {loadingMembers ? (
                <div className="cs-member-empty">Loading members…</div>
              ) : filteredMembers.length === 0 ? (
                <div className="cs-member-empty">No members found{searchQuery ? ` matching "${searchQuery}"` : ''}.</div>
              ) : filteredMembers.map((m) => {
                const isSelected = !!selectedMembers[m.user_id];
                return (
                  <div key={m.user_id} className={`cs-member-item ${isSelected ? 'selected' : ''}`}>
                    <div
                      className={`cs-member-row ${!isAdmin ? 'disabled' : ''}`}
                      onClick={() => isAdmin && toggleMember(m.user_id)}
                    >
                      <div className="cs-member-left">
                        <div className={`cs-member-avatar ${isSelected ? 'active' : 'idle'}`}>
                          {(m.full_name || m.email || 'U')[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cs-member-name">{m.full_name || m.email}</div>
                          <div className="cs-member-email">{m.email}</div>
                        </div>
                      </div>
                      {isSelected
                        ? <CheckCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                        : <Circle size={16} style={{ color: '#e2e8f0', flexShrink: 0 }} />
                      }
                    </div>
                    {isSelected && (
                      <div className="cs-member-role">
                        <div className="cs-member-role-label">Role</div>
                        <div style={{ position: 'relative' }}>
                          <select
                            className="cs-member-role-select"
                            value={selectedMembers[m.user_id]}
                            onChange={(e) => updateRole(m.user_id, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSystem;