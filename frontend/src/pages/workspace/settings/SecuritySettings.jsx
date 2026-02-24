import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Shield, Globe, Lock, ChevronDown, ChevronUp, Plus, Trash2, Save, Search, CheckCircle, AlertCircle, X } from 'lucide-react';
import api from '../../../api';
import LoadingState from '../../../components/LoadingState';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'editor', label: 'Editor' },
];

const roleLabel = (role) => ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
  .sec-root { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; width: 100%; }

  .sec-page-title { font-size: 18px; font-weight: 750; letter-spacing: -0.4px; color: #0a0a0a; margin: 0 0 4px; }
  .sec-page-sub { font-size: 13px; color: #64748b; margin: 0 0 28px; }

  /* Feedback */
  .sec-feedback { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; padding: 10px 14px; border-radius: 8px; border: 1.5px solid; margin-bottom: 16px; animation: secFade 0.15s ease; }
  @keyframes secFade { from { opacity:0; transform: translateY(-3px); } to { opacity:1; transform: translateY(0); } }
  .sec-feedback.success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .sec-feedback.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .sec-feedback-close { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.5; padding: 0; margin-left: auto; display: flex; align-items: center; }
  .sec-feedback-close:hover { opacity: 1; }

  /* Card */
  .sec-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; margin-bottom: 20px; }
  .sec-card-title { font-size: 13.5px; font-weight: 700; color: #0a0a0a; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; letter-spacing: -0.2px; }
  .sec-card-title svg { color: #2563eb; }

  /* Visibility row */
  .sec-vis-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sec-select-wrap { flex: 1; min-width: 200px; position: relative; }
  .sec-select {
    width: 100%; height: 38px; padding: 0 36px 0 13px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-family: inherit; color: #1e293b;
    background: #fafafa; outline: none; appearance: none; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .sec-select:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .sec-select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
  .sec-select-icon { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .sec-apply-btn {
    height: 38px; padding: 0 16px;
    background: #0a0a0a; color: #fff; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 650; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 6px; white-space: nowrap;
    transition: background 0.15s;
  }
  .sec-apply-btn:hover { background: #1e293b; }
  .sec-apply-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

  .sec-warn { margin-top: 10px; font-size: 12px; color: #b45309; background: #fef9c3; border: 1px solid #fde68a; padding: 8px 12px; border-radius: 7px; }

  /* IAM section */
  .sec-iam-head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 13.5px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.2px; }
  .sec-iam-head svg { color: #2563eb; }

  /* System accordion */
  .sec-system { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 11px; margin-bottom: 10px; overflow: visible; transition: border-color 0.15s; }
  .sec-system:hover { border-color: #cbd5e1; }
  .sec-system.expanded { border-color: #93c5fd; }

  .sec-system-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px; cursor: pointer; user-select: none; background: #fff; border-radius: 10px;
    transition: background 0.1s;
  }
  .sec-system-header:hover { background: #fafafa; }

  .sec-system-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .sec-system-icon {
    width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .sec-system-icon.idle { background: #f1f5f9; color: #64748b; }
  .sec-system-icon.active { background: #2563eb; color: #fff; }

  .sec-system-name { font-size: 13.5px; font-weight: 650; color: #1e293b; letter-spacing: -0.1px; }
  .sec-sys-badge {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    padding: 2px 7px; border-radius: 5px; border: 1px solid;
  }
  .sec-sys-badge.public { background: #ecfdf5; color: #15803d; border-color: #bbf7d0; }
  .sec-sys-badge.private { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }

  /* System body */
  .sec-system-body { padding: 16px; border-top: 1.5px solid #f1f5f9; background: #fafafa; border-radius: 0 0 10px 10px; }

  /* Permission rows */
  .sec-perm-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; background: #fff; border: 1.5px solid #f1f5f9;
    border-radius: 9px; margin-bottom: 8px;
    transition: border-color 0.15s;
  }
  .sec-perm-row:hover { border-color: #e2e8f0; }
  .sec-perm-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .sec-perm-avatar {
    width: 30px; height: 30px; border-radius: 7px;
    background: #dbeafe; color: #1d4ed8;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 800; flex-shrink: 0;
  }
  .sec-perm-name { font-size: 13px; font-weight: 650; color: #0a0a0a; }
  .sec-perm-sub { font-size: 11.5px; color: #94a3b8; margin-top: 1px; }
  .sec-perm-role { color: #2563eb; font-weight: 600; }
  .sec-revoke-btn {
    background: none; border: none; cursor: pointer; color: #cbd5e1;
    padding: 5px; border-radius: 6px; display: flex; align-items: center;
    transition: color 0.1s, background 0.1s; flex-shrink: 0;
  }
  .sec-revoke-btn:hover { color: #dc2626; background: #fef2f2; }

  .sec-no-perm {
    text-align: center; padding: 20px 16px;
    border: 2px dashed #e2e8f0; border-radius: 9px;
    font-size: 13px; color: #94a3b8; margin-bottom: 14px;
  }
  .sec-no-perm-sub { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

  /* Sub-sections */
  .sec-sub { background: #fff; border: 1.5px solid #f1f5f9; border-radius: 9px; padding: 14px 16px; margin-top: 10px; }
  .sec-sub-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin: 0 0 12px; }

  .sec-sub-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sec-sub-select-wrap { position: relative; min-width: 160px; }
  .sec-sub-select {
    width: 100%; height: 36px; padding: 0 32px 0 12px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-family: inherit; color: #1e293b;
    background: #fafafa; outline: none; appearance: none; cursor: pointer;
    transition: border-color 0.15s;
  }
  .sec-sub-select:focus { border-color: #2563eb; }
  .sec-sub-select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
  .sec-sub-select-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

  .sec-sub-save-btn {
    height: 36px; padding: 0 14px;
    background: #0a0a0a; color: #fff; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 650; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 6px;
    transition: background 0.15s;
  }
  .sec-sub-save-btn:hover { background: #1e293b; }
  .sec-sub-save-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

  /* Grant row */
  .sec-grant-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
  .sec-grant-input-wrap { flex: 1; min-width: 200px; position: relative; }
  .sec-grant-input-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .sec-grant-input {
    width: 100%; height: 36px; padding: 0 14px 0 32px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-family: inherit; color: #0a0a0a;
    background: #fff; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sec-grant-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .sec-grant-input::placeholder { color: #94a3b8; }

  .sec-picker-dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 9px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08); z-index: 20; overflow: hidden;
  }
  .sec-picker-item {
    width: 100%; text-align: left; background: none; border: none;
    border-bottom: 1px solid #f1f5f9; padding: 9px 12px;
    cursor: pointer; font-family: inherit; transition: background 0.1s;
  }
  .sec-picker-item:last-child { border-bottom: none; }
  .sec-picker-item:hover { background: #eff6ff; }
  .sec-picker-name { font-size: 13px; font-weight: 600; color: #0a0a0a; }
  .sec-picker-email { font-size: 11.5px; color: #94a3b8; margin-top: 1px; }
  .sec-picker-empty { padding: 10px 12px; font-size: 12.5px; color: #94a3b8; }
  .sec-picker-selected { font-size: 12px; color: #16a34a; margin-top: 4px; font-weight: 500; }

  .sec-grant-add-btn {
    width: 36px; height: 36px; flex-shrink: 0;
    background: #2563eb; color: #fff; border: none; border-radius: 8px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, transform 0.1s;
  }
  .sec-grant-add-btn:hover { background: #1d4ed8; }
  .sec-grant-add-btn:active { transform: scale(0.95); }
  .sec-grant-add-btn:disabled { background: #e2e8f0; cursor: not-allowed; transform: none; }

  /* Non-admin note */
  .sec-non-admin { background: #fafafa; border: 1.5px solid #e2e8f0; border-radius: 11px; padding: 20px; color: #64748b; font-size: 13px; }
`;

const SecuritySettings = () => {
  const { workspaceId } = useParams();
  const { isAdmin } = useOutletContext();

  const [systems, setSystems] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [initialVisibility, setInitialVisibility] = useState('private');
  const [expandedSystem, setExpandedSystem] = useState(null);
  const [systemVisDrafts, setSystemVisDrafts] = useState({});
  const [systemVisSaving, setSystemVisSaving] = useState({});
  const [grantForms, setGrantForms] = useState({});
  const [loadingIam, setLoadingIam] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const defaultForm = useMemo(() => ({ query: '', selectedUserId: '', role: 'viewer', submitting: false, openPicker: false }), []);

  const showAdminOnly = () => { setError('Action allowed only for admin.'); setTimeout(() => setError(''), 2500); };

  const fetchVisibility = async () => {
    try {
      const r = await api.get(`workspaces/${workspaceId}/`);
      const v = r.data?.visibility || 'private';
      setVisibility(v); setInitialVisibility(v);
    } catch { setError('Failed to load workspace visibility.'); }
  };

  const fetchMembers = async () => {
    if (!isAdmin) { setWorkspaceMembers([]); return; }
    try {
      const [mR, pR] = await Promise.all([api.get(`workspaces/${workspaceId}/members/`), api.get('auth/profile/')]);
      const uid = pR.data?.user_id || '';
      setCurrentUserId(uid);
      setWorkspaceMembers((mR.data || []).filter((m) => m.user_id !== uid));
    } catch (e) { setError(e.response?.data?.error || 'Failed to load members.'); }
  };

  const fetchIam = async () => {
    if (!isAdmin) { setSystems([]); setLoadingIam(false); return; }
    setLoadingIam(true);
    try {
      const r = await api.get(`workspaces/${workspaceId}/system-permissions/`);
      const list = r.data || [];
      setSystems(list);
      setSystemVisDrafts(list.reduce((acc, s) => { acc[s.system_id] = s.visibility || 'private'; return acc; }, {}));
      setExpandedSystem((cur) => (cur && list.some((s) => s.system_id === cur)) ? cur : (list[0]?.system_id || null));
    } catch (e) { setError(e.response?.data?.error || 'Failed to load IAM policies.'); }
    finally { setLoadingIam(false); }
  };

  useEffect(() => { fetchVisibility(); }, [workspaceId]);
  useEffect(() => { fetchMembers(); fetchIam(); }, [workspaceId, isAdmin]);

  useEffect(() => {
    const handleDown = (e) => {
      if (!e.target?.closest?.('[data-member-picker]')) {
        setGrantForms((p) => {
          const n = { ...p };
          Object.keys(n).forEach((id) => { if (n[id]?.openPicker) n[id] = { ...n[id], openPicker: false }; });
          return n;
        });
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, []);

  const applyVisibility = async () => {
    if (!isAdmin) { showAdminOnly(); return; }
    setError(''); setSuccess('');
    try {
      await api.patch(`workspaces/${workspaceId}/`, { visibility });
      setInitialVisibility(visibility);
      await fetchIam();
      setSuccess('Workspace visibility updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) { setError(e.response?.data?.error || 'Failed to update visibility.'); }
  };

  const saveSystemVis = async (systemId) => {
    if (!isAdmin) { showAdminOnly(); return; }
    const next = systemVisDrafts[systemId] || 'private';
    setError(''); setSuccess('');
    setSystemVisSaving((p) => ({ ...p, [systemId]: true }));
    try {
      await api.patch(`workspaces/${workspaceId}/canvases/${systemId}/`, { visibility: visibility === 'private' ? 'private' : next });
      setSuccess('System visibility updated.');
      await fetchIam();
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) { setError(e.response?.data?.error || 'Failed to update system visibility.'); }
    finally { setSystemVisSaving((p) => ({ ...p, [systemId]: false })); }
  };

  const updateForm = (systemId, updates) => {
    setGrantForms((p) => ({ ...p, [systemId]: { ...(p[systemId] || defaultForm), ...updates } }));
  };

  const getFilteredMembers = (systemId) => {
    const form = grantForms[systemId] || defaultForm;
    const q = (form.query || '').trim().toLowerCase();
    const granted = new Set((systems.find((s) => s.system_id === systemId)?.permissions || []).map((p) => p.user_id));
    return workspaceMembers
      .filter((m) => m.user_id !== currentUserId && !granted.has(m.user_id))
      .filter((m) => !q || (m.full_name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q))
      .slice(0, 8);
  };

  const getSelectedMember = (systemId) => {
    const form = grantForms[systemId] || defaultForm;
    if (form.selectedUserId) return workspaceMembers.find((m) => m.user_id === form.selectedUserId) || null;
    const q = (form.query || '').trim().toLowerCase();
    if (!q) return null;
    return workspaceMembers.find((m) => (m.email || '').toLowerCase() === q) || null;
  };

  const handleGrantAccess = async (systemId) => {
    if (!isAdmin) { showAdminOnly(); return; }
    const form = grantForms[systemId] || defaultForm;
    const member = getSelectedMember(systemId);
    if (!member) { setError('Select a workspace member to grant access.'); return; }
    setError(''); setSuccess('');
    updateForm(systemId, { submitting: true });
    try {
      const r = await api.post(`workspaces/${workspaceId}/systems/${systemId}/permissions/`, { user_id: member.user_id, role: form.role });
      setSuccess(r.data?.message || 'Access granted.');
      updateForm(systemId, { query: '', selectedUserId: '', submitting: false, openPicker: false });
      await fetchIam();
    } catch (e) { setError(e.response?.data?.error || 'Failed to grant access.'); updateForm(systemId, { submitting: false }); }
  };

  const handleRevokeAccess = async (systemId, userId) => {
    if (!isAdmin) { showAdminOnly(); return; }
    setError(''); setSuccess('');
    try {
      const r = await api.delete(`workspaces/${workspaceId}/systems/${systemId}/permissions/${userId}/`);
      setSuccess(r.data?.message || 'Access revoked.');
      await fetchIam();
    } catch (e) { setError(e.response?.data?.error || 'Failed to revoke access.'); }
  };

  return (
    <div className="sec-root">
      <style>{styles}</style>

      <h2 className="sec-page-title">Security & Permissions</h2>
      <p className="sec-page-sub">Configure visibility and granular system access control.</p>

      {error && (
        <div className="sec-feedback error">
          <AlertCircle size={14} /> {error}
          <button className="sec-feedback-close" onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}
      {success && (
        <div className="sec-feedback success">
          <CheckCircle size={14} /> {success}
          <button className="sec-feedback-close" onClick={() => setSuccess('')}><X size={13} /></button>
        </div>
      )}

      {/* Workspace visibility */}
      <div className="sec-card">
        <div className="sec-card-title"><Globe size={15} /> Workspace Visibility</div>
        <div className="sec-vis-row">
          <div className="sec-select-wrap">
            <select
              className="sec-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              disabled={!isAdmin}
            >
              <option value="private">Private — Invite only</option>
              <option value="public">Public — Visible to anyone</option>
            </select>
            <ChevronDown size={14} className="sec-select-icon" />
          </div>
          <button className="sec-apply-btn" onClick={applyVisibility} disabled={!isAdmin}>
            Apply Changes
          </button>
        </div>
        {initialVisibility === 'public' && visibility === 'private' && (
          <div className="sec-warn">
            ⚠ Switching to Private will also make all public systems within this workspace private.
          </div>
        )}
      </div>

      {/* IAM */}
      {isAdmin ? (
        <div>
          <div className="sec-iam-head"><Shield size={15} /> IAM — Identity & Access Management</div>

          {loadingIam ? (
            <LoadingState message="Loading IAM policies" minHeight={240} imageWidth={138} />
          ) : systems.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: 20 }}>
              No systems found in this workspace yet.
            </div>
          ) : (
            systems.map((system) => {
              const expanded = expandedSystem === system.system_id;
              const form = grantForms[system.system_id] || defaultForm;
              const selectedMember = getSelectedMember(system.system_id);
              const filteredMembers = getFilteredMembers(system.system_id);
              const sysVis = systemVisDrafts[system.system_id] || system.visibility || 'private';
              const savingVis = !!systemVisSaving[system.system_id];

              return (
                <div key={system.system_id} className={`sec-system ${expanded ? 'expanded' : ''}`}>
                  <div className="sec-system-header" onClick={() => setExpandedSystem(expanded ? null : system.system_id)}>
                    <div className="sec-system-left">
                      <div className={`sec-system-icon ${expanded ? 'active' : 'idle'}`}>
                        <Lock size={14} />
                      </div>
                      <span className="sec-system-name">{system.system_name}</span>
                      <span className={`sec-sys-badge ${sysVis}`}>{sysVis}</span>
                    </div>
                    {expanded ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
                  </div>

                  {expanded && (
                    <div className="sec-system-body">
                      {/* Permissions list */}
                      {(system.permissions?.length > 0) ? system.permissions.map((u) => (
                        <div key={u.user_id} className="sec-perm-row">
                          <div className="sec-perm-left">
                            <div className="sec-perm-avatar">{(u.full_name || u.email || 'U')[0].toUpperCase()}</div>
                            <div>
                              <div className="sec-perm-name">{u.full_name || u.email}</div>
                              <div className="sec-perm-sub">{u.email} · <span className="sec-perm-role">{roleLabel(u.role)}</span></div>
                            </div>
                          </div>
                          <button className="sec-revoke-btn" title="Revoke access" onClick={() => handleRevokeAccess(system.system_id, u.user_id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )) : (
                        <div className="sec-no-perm">
                          No access policy set for this system.
                          <div className="sec-no-perm-sub">Public systems are visible to signed-in users. Private systems are visible to workspace members.</div>
                        </div>
                      )}

                      {/* System visibility */}
                      <div className="sec-sub">
                        <div className="sec-sub-label">System Visibility</div>
                        <div className="sec-sub-row">
                          <div className="sec-sub-select-wrap">
                            <select
                              className="sec-sub-select"
                              value={visibility === 'private' ? 'private' : sysVis}
                              onChange={(e) => setSystemVisDrafts((p) => ({ ...p, [system.system_id]: e.target.value }))}
                              disabled={!isAdmin || visibility === 'private' || savingVis}
                            >
                              <option value="private">Private</option>
                              <option value="public">Public</option>
                            </select>
                            <ChevronDown size={13} className="sec-sub-select-icon" />
                          </div>
                          <button
                            className="sec-sub-save-btn"
                            onClick={() => saveSystemVis(system.system_id)}
                            disabled={!isAdmin || visibility === 'private' || savingVis}
                          >
                            <Save size={13} />
                            {savingVis ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                        {visibility === 'private' && <div className="sec-warn" style={{ marginTop: 8 }}>Systems must be private within a private workspace.</div>}
                      </div>

                      {/* Grant access */}
                      <div className="sec-sub" style={{ marginTop: 10 }}>
                        <div className="sec-sub-label">Grant Access — {system.system_name}</div>
                        <div className="sec-grant-row">
                          <div className="sec-grant-input-wrap" data-member-picker="true" style={{ position: 'relative' }}>
                            <Search size={13} className="sec-grant-input-icon" />
                            <input
                              className="sec-grant-input"
                              type="text"
                              value={form.query}
                              placeholder="Search member by name or email…"
                              onFocus={() => updateForm(system.system_id, { openPicker: true })}
                              onChange={(e) => updateForm(system.system_id, { query: e.target.value, selectedUserId: '', openPicker: true })}
                            />
                            {form.openPicker && (
                              <div className="sec-picker-dropdown">
                                {filteredMembers.length === 0 ? (
                                  <div className="sec-picker-empty">No matching members.</div>
                                ) : filteredMembers.map((m) => (
                                  <button
                                    key={m.user_id}
                                    type="button"
                                    className="sec-picker-item"
                                    onClick={() => updateForm(system.system_id, { query: m.email, selectedUserId: m.user_id, openPicker: false })}
                                  >
                                    <div className="sec-picker-name">{m.full_name || m.email}</div>
                                    <div className="sec-picker-email">{m.email}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {selectedMember && (
                              <div className="sec-picker-selected">✓ {selectedMember.email}</div>
                            )}
                          </div>

                          <div className="sec-sub-select-wrap" style={{ minWidth: 130 }}>
                            <select
                              className="sec-sub-select"
                              value={form.role}
                              onChange={(e) => updateForm(system.system_id, { role: e.target.value })}
                            >
                              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <ChevronDown size={13} className="sec-sub-select-icon" />
                          </div>

                          <button
                            className="sec-grant-add-btn"
                            onClick={() => handleGrantAccess(system.system_id)}
                            disabled={form.submitting}
                            title="Grant access"
                          >
                            {form.submitting
                              ? <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'secSpin 0.7s linear infinite', display:'block' }} />
                              : <Plus size={15} />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="sec-non-admin">
          IAM options are available only to workspace admins.
        </div>
      )}
      <style>{`@keyframes secSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SecuritySettings;
