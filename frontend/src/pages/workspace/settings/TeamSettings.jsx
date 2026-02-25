import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Trash2, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useOutletContext, useParams } from 'react-router-dom';
import api from '../../../api';
import LoadingState from '../../../components/LoadingState';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
  .ts-root { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; }

  .ts-page-title { font-size: 18px; font-weight: 750; letter-spacing: -0.4px; color: var(--text); margin: 0 0 4px; }
  .ts-page-sub { font-size: 13px; color: var(--text-muted); margin: 0 0 28px; }

  /* Feedback */
  .ts-feedback {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 500; padding: 10px 14px;
    border-radius: 8px; border: 1.5px solid; margin-bottom: 16px;
    animation: tsFadeIn 0.15s ease;
  }
  @keyframes tsFadeIn { from { opacity:0; transform: translateY(-3px); } to { opacity:1; transform: translateY(0); } }
  .ts-feedback.success { background: rgba(34, 197, 94, 0.12); border-color: rgba(34, 197, 94, 0.35); color: #22c55e; }
  .ts-feedback.error { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.35); color: var(--danger); }

  /* Card */
  .ts-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; margin-bottom: 16px; overflow: hidden; }

  /* Invite section */
  .ts-invite-head {
    padding: 16px 20px; border-bottom: 1.5px solid var(--border);
  }
  .ts-invite-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin: 0 0 12px; }
  .ts-invite-row { display: flex; gap: 8px; align-items: stretch; }
  .ts-invite-input-wrap { flex: 1; position: relative; }
  .ts-invite-input-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); pointer-events: none; }
  .ts-invite-input {
    width: 100%; height: 38px; padding: 0 14px 0 34px;
    border: 1.5px solid var(--border); border-radius: 8px;
    font-size: 13px; font-family: inherit;
    color: var(--text); background: var(--surface-2); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .ts-invite-input:focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .ts-invite-input::placeholder { color: var(--text-subtle); }
  .ts-invite-input:disabled { background: var(--surface-3); color: var(--text-subtle); cursor: not-allowed; }
  .ts-invite-btn {
    height: 38px; padding: 0 16px;
    background: var(--text); color: #fff;
    border: none; border-radius: 8px;
    font-size: 13px; font-weight: 650;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 6px;
    transition: background 0.15s; white-space: nowrap;
  }
  .ts-invite-btn:hover { background: color-mix(in srgb, var(--text), #000 12%); }
  .ts-invite-btn:disabled { background: var(--border); color: var(--text-subtle); cursor: not-allowed; }

  /* Sections */
  .ts-section-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; border-bottom: 1.5px solid var(--border);
    background: var(--surface-2);
  }
  .ts-section-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
  .ts-count { font-size: 11px; font-weight: 700; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); padding: 2px 8px; border-radius: 20px; }

  /* Rows */
  .ts-list { padding: 8px 12px; }
  .ts-empty { padding: 16px 18px; font-size: 13px; color: var(--text-subtle); }

  .ts-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 10px; border: 1.5px solid var(--border); border-radius: 9px;
    margin-bottom: 6px; background: var(--surface); transition: border-color 0.15s;
  }
  .ts-row:hover { border-color: var(--border-strong); }
  .ts-row:last-child { margin-bottom: 0; }

  .ts-row-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ts-avatar {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; flex-shrink: 0;
  }
  .ts-avatar.blue { background: color-mix(in srgb, var(--accent), transparent 75%); color: var(--accent); }
  .ts-avatar.slate { background: var(--surface-3); color: var(--text-muted); }
  .ts-avatar.amber { background: color-mix(in srgb, var(--warning), transparent 75%); color: var(--warning); }

  .ts-row-info { min-width: 0; }
  .ts-row-name { font-size: 13.5px; font-weight: 650; color: var(--text); letter-spacing: -0.1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ts-row-sub { font-size: 12px; color: var(--text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .ts-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  .ts-badge {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    padding: 3px 8px; border-radius: 5px; border: 1px solid;
  }
  .ts-badge.admin { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-2); }
  .ts-badge.member { background: var(--surface-2); color: var(--text-muted); border-color: var(--border); }
  .ts-badge.pending { background: rgba(251, 191, 36, 0.14); color: var(--warning); border-color: rgba(251, 191, 36, 0.35); }

  .ts-delete-btn {
    background: none; border: none; cursor: pointer;
    color: var(--border-strong); padding: 6px; border-radius: 7px;
    display: flex; align-items: center;
    transition: color 0.1s, background 0.1s;
  }
  .ts-delete-btn:hover { color: var(--danger); background: rgba(239, 68, 68, 0.12); }
  .ts-delete-btn:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const TeamSettings = () => {
  const { workspaceId } = useParams();
  const { isAdmin } = useOutletContext();

  const [members, setMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const showAdminOnly = () => setError('Action allowed only for admin.');

  const fetchMembers = useCallback(async () => {
    const r = await api.get(`workspaces/${workspaceId}/members/`);
    setMembers(r.data);
  }, [workspaceId]);

  const fetchPending = useCallback(async () => {
    if (!isAdmin) { setPendingInvitations([]); return; }
    const r = await api.get(`workspaces/${workspaceId}/invitations/`);
    setPendingInvitations(r.data || []);
  }, [workspaceId, isAdmin]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { await Promise.all([fetchMembers(), fetchPending()]); }
    catch (e) { setError(e.response?.data?.error || 'Failed to load team data.'); }
    finally { setLoading(false); }
  }, [fetchMembers, fetchPending]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!isAdmin) { showAdminOnly(); return; }
    if (!inviteEmail.trim()) return;
    setSendingInvite(true); setError(''); setMessage('');
    try {
      const r = await api.post(`workspaces/${workspaceId}/invitations/`, { email: inviteEmail.trim() });
      setMessage(r.data?.message || 'Invitation sent.');
      setInviteEmail('');
      await refresh();
    } catch (e) { setError(e.response?.data?.error || 'Failed to send invitation.'); }
    finally { setSendingInvite(false); }
  };

  const handleRemoveMember = async (member) => {
    if (!isAdmin) { showAdminOnly(); return; }
    if (member.role === 'ADMIN') { setError('Admin members cannot be removed.'); return; }
    setError(''); setMessage('');
    try {
      const r = await api.delete(`workspaces/${workspaceId}/members/${member.user_id}/`);
      setMessage(r.data?.message || 'Member removed.');
      await refresh();
    } catch (e) { setError(e.response?.data?.error || 'Failed to remove member.'); }
  };

  const handleCancelInvitation = async (token) => {
    if (!isAdmin) { showAdminOnly(); return; }
    setError(''); setMessage('');
    try {
      const r = await api.delete(`workspaces/${workspaceId}/invitations/${token}/`);
      setMessage(r.data?.message || 'Invitation cancelled.');
      await refresh();
    } catch (e) { setError(e.response?.data?.error || 'Failed to cancel invitation.'); }
  };

  return (
    <div className="ts-root">
      <style>{styles}</style>

      <h2 className="ts-page-title">Team Members</h2>
      <p className="ts-page-sub">Manage access permissions and roles for your workspace.</p>

      {message && (
        <div className="ts-feedback success">
          <CheckCircle size={14} /> {message}
          <button style={{ background:'none', border:'none', cursor:'pointer', marginLeft:'auto', color:'inherit', opacity:0.6, display:'flex', alignItems:'center' }} onClick={() => setMessage('')}><X size={13} /></button>
        </div>
      )}
      {error && (
        <div className="ts-feedback error">
          <AlertCircle size={14} /> {error}
          <button style={{ background:'none', border:'none', cursor:'pointer', marginLeft:'auto', color:'inherit', opacity:0.6, display:'flex', alignItems:'center' }} onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}

      {/* Invite */}
      <div className="ts-card">
        <div className="ts-invite-head">
          <div className="ts-invite-label">Invite new member</div>
          <form onSubmit={handleInvite} className="ts-invite-row">
            <div className="ts-invite-input-wrap">
              <Mail size={14} className="ts-invite-input-icon" />
              <input
                type="email"
                className="ts-invite-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                readOnly={!isAdmin}
                placeholder="colleague@company.com"
              />
            </div>
            <button type="submit" className="ts-invite-btn" disabled={sendingInvite || !isAdmin}>
              <Send size={13} />
              {sendingInvite ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </div>
      </div>

      {/* Pending invitations */}
      {isAdmin && (
        <div className="ts-card">
          <div className="ts-section-head">
            <span className="ts-section-label">Pending Invitations</span>
            <span className="ts-count">{pendingInvitations.length}</span>
          </div>
          {pendingInvitations.length === 0 ? (
            <div className="ts-empty">No pending invitations.</div>
          ) : (
            <div className="ts-list">
              {pendingInvitations.map((inv) => (
                <div key={inv.token} className="ts-row">
                  <div className="ts-row-left">
                    <div className="ts-avatar amber">{inv.email[0].toUpperCase()}</div>
                    <div className="ts-row-info">
                      <div className="ts-row-name">{inv.email}</div>
                      <div className="ts-row-sub">Role: {inv.role}</div>
                    </div>
                  </div>
                  <div className="ts-row-right">
                    <span className="ts-badge pending">Pending</span>
                    <button
                      type="button"
                      className="ts-delete-btn"
                      onClick={() => handleCancelInvitation(inv.token)}
                      title="Cancel invitation"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active members */}
      <div className="ts-card">
        <div className="ts-section-head">
          <span className="ts-section-label">Active Members</span>
          <span className="ts-count">{members.length}</span>
        </div>
        {loading ? (
          <div style={{ padding: '12px 0' }}>
            <LoadingState message="Loading members" minHeight={220} imageWidth={132} />
          </div>
        ) : members.length === 0 ? (
          <div className="ts-empty">No members found.</div>
        ) : (
          <div className="ts-list">
            {members.map((m) => (
              <div key={m.user_id} className="ts-row">
                <div className="ts-row-left">
                  <div className={`ts-avatar ${m.role === 'ADMIN' ? 'blue' : 'slate'}`}>
                    {(m.full_name || m.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="ts-row-info">
                    <div className="ts-row-name">{m.full_name || m.email}</div>
                    <div className="ts-row-sub">{m.email}</div>
                  </div>
                </div>
                <div className="ts-row-right">
                  <span className={`ts-badge ${m.role === 'ADMIN' ? 'admin' : 'member'}`}>
                    {m.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </span>
                  <button
                    type="button"
                    className="ts-delete-btn"
                    onClick={() => handleRemoveMember(m)}
                    disabled={!isAdmin || m.role === 'ADMIN'}
                    title="Remove member"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSettings;
