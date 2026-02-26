import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Globe, Lock, Plus, ChevronLeft, X } from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import api from '../../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

  .cw-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text);
  }

  .cw-main {
    width: 100%;
    margin: 0;
    padding: 24px 24px 64px;
  }

  /* ── Topbar (settings-like) ── */
  .cw-topbar {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 0 16px;
    height: 54px;
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 18px;
  }

  .cw-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 54px;
    padding: 0 12px 0 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
    transition: color 0.1s;
  }
  .cw-back-btn:hover { color: var(--text); }

  .cw-topbar-divider {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 12px 0 0;
    flex-shrink: 0;
  }

  /* ── Breadcrumb ── */
  .cw-breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--text-subtle);
    margin: 0;
  }
  .cw-breadcrumb-link {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 12.5px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    font-weight: 500;
    transition: color 0.1s;
  }
  .cw-breadcrumb-link:hover { color: var(--accent); }
  .cw-breadcrumb-sep { color: var(--border-strong); }
  .cw-breadcrumb-current { color: var(--text-subtle); font-weight: 500; }

  /* ── Card shell ── */
  .cw-card {
    width: 100%;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  @media (min-width: 900px) {
    .cw-card { flex-direction: row; }
  }

  /* ── Left panel ── */
  .cw-left {
    flex: 1 1 0%;
    padding: 40px 44px;
    display: flex;
    flex-direction: column;
    border-bottom: 1.5px solid var(--border);
  }

  @media (min-width: 900px) {
    .cw-left {
      border-bottom: none;
      border-right: 1.5px solid var(--border);
    }
  }

  .cw-panel-title {
    font-size: 22px;
    font-weight: 750;
    letter-spacing: -0.5px;
    color: var(--text);
    margin: 0 0 6px;
  }

  .cw-panel-subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0 0 32px;
    font-weight: 400;
  }

  /* ── Field group ── */
  .cw-field {
    margin-bottom: 26px;
  }

  .cw-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .cw-input {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 14.5px;
    font-family: inherit;
    color: var(--text);
    background: var(--surface-2);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    box-sizing: border-box;
  }

  .cw-input:focus {
    border-color: var(--accent);
    background: var(--surface);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .cw-input::placeholder { color: var(--text-subtle); }

  .cw-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 14.5px;
    font-family: inherit;
    color: var(--text);
    background: var(--surface-2);
    outline: none;
    resize: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    box-sizing: border-box;
    line-height: 1.55;
  }

  .cw-textarea:focus {
    border-color: var(--accent);
    background: var(--surface);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .cw-textarea::placeholder { color: var(--text-subtle); }

  .cw-error {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--danger);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* ── Visibility options ── */
  .cw-vis-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cw-vis-option {
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 16px 18px;
    cursor: pointer;
    background: var(--surface-2);
    text-align: left;
    font-family: inherit;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    position: relative;
    overflow: hidden;
  }

  .cw-vis-option::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--accent);
    opacity: 0;
    transition: opacity 0.15s;
  }

  .cw-vis-option:hover {
    border-color: var(--border-strong);
    background: var(--surface);
  }

  .cw-vis-option.selected {
    border-color: var(--accent-2);
    background: var(--accent-soft);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06);
  }

  .cw-vis-option.selected::before { opacity: 1; }

  .cw-vis-option-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 6px;
  }

  .cw-vis-icon {
    width: 34px;
    height: 34px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }

  .cw-vis-icon.neutral {
    background: var(--surface-3);
    color: var(--text-muted);
  }

  .cw-vis-icon.active {
    background: var(--accent);
    color: #fff;
  }

  .cw-vis-name {
    font-size: 14.5px;
    font-weight: 650;
    letter-spacing: -0.1px;
  }

  .cw-vis-name.neutral { color: var(--text-muted); }
  .cw-vis-name.active { color: var(--accent); }

  .cw-vis-desc {
    font-size: 13px;
    color: var(--text-subtle);
    line-height: 1.5;
    padding-left: 43px;
  }

  /* ── Footer actions ── */
  .cw-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 28px;
    margin-top: auto;
    border-top: 1.5px solid var(--border);
  }

  .cw-cancel-btn {
    height: 42px;
    padding: 0 16px;
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
  }
  .cw-cancel-btn:hover {
    border-color: var(--border-strong);
    color: var(--text);
    background: var(--surface-2);
  }

  .cw-submit-btn {
    height: 42px;
    padding: 0 20px;
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: -0.1px;
  }
  .cw-submit-btn:hover { background: color-mix(in srgb, var(--text), #000 12%); }
  .cw-submit-btn:active { transform: scale(0.98); }
  .cw-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .cw-submit-text-mobile { display: none; }
  .cw-submit-text-desktop { display: inline; }

  /* ── Right panel ── */
  .cw-right {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }

  @media (min-width: 900px) {
    .cw-right { width: 320px; flex-shrink: 0; }
  }

  .cw-right-head {
    padding: 28px 28px 16px;
    border-bottom: 1.5px solid var(--border);
  }

  .cw-right-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 3px;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.2px;
  }

  .cw-right-title svg { color: var(--accent); }

  .cw-right-subtitle {
    font-size: 13.5px;
    color: var(--text-subtle);
    margin: 0;
    font-weight: 400;
  }

  /* ── Invite input ── */
  .cw-invite-wrap {
    padding: 16px 28px;
    border-bottom: 1.5px solid var(--border);
  }

  .cw-invite-row {
    display: flex;
    gap: 6px;
  }

  .cw-invite-input {
    flex: 1;
    height: 40px;
    padding: 0 12px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text);
    background: var(--surface-2);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    min-width: 0;
  }
  .cw-invite-input:focus {
    border-color: var(--accent);
    background: var(--surface);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }
  .cw-invite-input::placeholder { color: var(--text-subtle); }
  .cw-invite-input:disabled { opacity: 0.5; }

  .cw-invite-add-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, transform 0.1s;
  }
  .cw-invite-add-btn:hover { background: color-mix(in srgb, var(--text), #000 12%); }
  .cw-invite-add-btn:active { transform: scale(0.95); }
  .cw-invite-add-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .cw-invite-error {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--danger);
  }

  /* ── Members list ── */
  .cw-members-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 14px 28px 24px;
  }

  .cw-members-label {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-subtle);
    margin-bottom: 10px;
  }

  .cw-member-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 12px;
    border: 1.5px solid var(--border);
    border-radius: 9px;
    margin-bottom: 7px;
    background: var(--surface-2);
    transition: border-color 0.15s;
    animation: memberFadeIn 0.18s ease;
  }

  @keyframes memberFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cw-member-row.owner {
    border-color: var(--accent-2);
    background: color-mix(in srgb, var(--accent), transparent 85%);
  }

  .cw-member-row:not(.owner):hover { border-color: var(--border-strong); }

  .cw-member-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .cw-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    flex-shrink: 0;
    letter-spacing: 0;
  }

  .cw-avatar.owner-av {
    background: color-mix(in srgb, var(--accent), transparent 80%);
    color: var(--accent);
  }

  .cw-avatar.member-av {
    background: var(--surface-3);
    color: var(--text-muted);
  }

  .cw-member-email {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cw-member-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent-2);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .cw-member-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--border-strong);
    display: flex;
    align-items: center;
    padding: 2px;
    border-radius: 4px;
    transition: color 0.1s, background 0.1s;
    flex-shrink: 0;
  }
  .cw-member-remove:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.12);
  }

  @media (max-width: 640px) {
    .cw-main { padding: 16px 16px 48px; }
    .cw-left { padding: 28px 22px; }
    .cw-topbar {
      height: 50px;
      padding: 0 12px;
      border-radius: 12px;
    }
    .cw-back-btn { height: 50px; font-size: 12.5px; }
    .cw-topbar-divider { height: 16px; margin-right: 10px; }
    .cw-breadcrumb { font-size: 12px; }
    .cw-vis-desc { display: none; }
    .cw-vis-option { padding: 10px 12px; }
    .cw-vis-option-head { margin-bottom: 0; gap: 8px; }
    .cw-vis-icon { width: 26px; height: 26px; border-radius: 6px; }
    .cw-vis-name { font-size: 13px; }
    .cw-submit-text-mobile { display: inline; }
    .cw-submit-text-desktop { display: none; }
    .cw-submit-icon { display: none; }
  }
`;

const CreateWorkspace = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [inviteError, setInviteError] = useState('');

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('workspaces/', {
        name,
        description,
        visibility: visibility.toLowerCase(),
      });
      const workspaceId = response.data.id;
      if (members.length > 0) {
        await Promise.allSettled(
          members.map((email) => api.post(`workspaces/${workspaceId}/invitations/`, { email }))
        );
      }
      navigate(`/app/ws/${workspaceId}`);
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) { setInviteError('Enter a valid email address.'); return; }
    if (members.some((m) => m.toLowerCase() === email)) { setInviteError('Already added.'); return; }
    setInviteError('');
    setMembers([...members, email]);
    setInviteEmail('');
  };

  return (
    <div className="cw-root">
      <style>{styles}</style>
      <AuthenticatedNavbar />

      <main className="cw-main">
        {/* Topbar */}
        <div className="cw-topbar">
          <button className="cw-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="cw-topbar-divider" />
          <div className="cw-breadcrumb">
            <button className="cw-breadcrumb-link" onClick={() => navigate('/app')}>Home</button>
            <span className="cw-breadcrumb-sep">/</span>
            <span className="cw-breadcrumb-current">New Workspace</span>
          </div>
        </div>

        <div className="cw-card">
          {/* ── LEFT: Form ── */}
          <div className="cw-left">
            <h1 className="cw-panel-title">Create a workspace</h1>
            <p className="cw-panel-subtitle">Set up a shared environment for your team and projects.</p>

            <form onSubmit={handleFinish} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Name */}
              <div className="cw-field">
                <label className="cw-label">Workspace Name</label>
                <input
                  type="text"
                  className="cw-input"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
                  placeholder="e.g. Acme Corp Engineering"
                />
                {error && <div className="cw-error">↑ {error}</div>}
              </div>

              {/* Visibility */}
              <div className="cw-field">
                <label className="cw-label">Visibility</label>
                <div className="cw-vis-grid">
                  {[
                    {
                      key: 'private',
                      icon: <Lock size={15} />,
                      label: 'Private',
                      desc: 'Only invited members can access.',
                    },
                    {
                      key: 'public',
                      icon: <Globe size={15} />,
                      label: 'Public',
                      desc: 'Visible and discoverable by anyone.',
                    },
                  ].map(({ key, icon, label, desc }) => {
                    const active = visibility === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`cw-vis-option ${active ? 'selected' : ''}`}
                        onClick={() => setVisibility(key)}
                      >
                        <div className="cw-vis-option-head">
                          <div className={`cw-vis-icon ${active ? 'active' : 'neutral'}`}>
                            {icon}
                          </div>
                          <span className={`cw-vis-name ${active ? 'active' : 'neutral'}`}>{label}</span>
                        </div>
                        <p className="cw-vis-desc">{desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="cw-field">
                <label className="cw-label">Description <span style={{ color: '#cbd5e1', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
                <textarea
                  className="cw-textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace for?"
                />
              </div>

              {/* Actions */}
              <div className="cw-actions">
                <button type="button" className="cw-cancel-btn" onClick={() => navigate('/app')}>
                  Cancel
                </button>
                <button type="submit" className="cw-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span style={{
                        width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        animation: 'cw-spin 0.7s linear infinite', display: 'inline-block'
                      }} />
                      Creating…
                    </>
                  ) : (
                    <>
                      <span className="cw-submit-icon"><Plus size={15} /></span>
                      <span className="cw-submit-text-desktop">Create workspace</span>
                      <span className="cw-submit-text-mobile">Create</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── RIGHT: Invite ── */}
          <div className="cw-right">
            <div className="cw-right-head">
              <h3 className="cw-right-title">
                <UserPlus size={16} />
                Invite members
              </h3>
              <p className="cw-right-subtitle">Add teammates — they'll get an email invite.</p>
            </div>

            <div className="cw-invite-wrap">
              <form onSubmit={handleAddMember} className="cw-invite-row">
                <input
                  type="email"
                  className="cw-invite-input"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); if (inviteError) setInviteError(''); }}
                  placeholder="colleague@company.com"
                  disabled={loading}
                />
                <button type="submit" className="cw-invite-add-btn" disabled={loading} title="Add member">
                  <Plus size={16} />
                </button>
              </form>
              {inviteError && <div className="cw-invite-error">{inviteError}</div>}
            </div>

            <div className="cw-members-wrap">
              <div className="cw-members-label">
                Members — {members.length + 1}
              </div>

              {/* Owner row */}
              <div className="cw-member-row owner">
                <div className="cw-member-left">
                  <div className="cw-avatar owner-av">Y</div>
                  <span className="cw-member-email">You</span>
                </div>
                <span className="cw-member-badge">Owner</span>
              </div>

              {/* Invited members */}
              {members.map((email, i) => (
                <div key={i} className="cw-member-row">
                  <div className="cw-member-left">
                    <div className="cw-avatar member-av">{email[0].toUpperCase()}</div>
                    <span className="cw-member-email">{email}</span>
                  </div>
                  <button
                    type="button"
                    className="cw-member-remove"
                    onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes cw-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CreateWorkspace;
