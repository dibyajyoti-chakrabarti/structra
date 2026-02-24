import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Trash2, Building, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
  .gs-root { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; width: 100%; }

  /* Toast */
  .gs-toast-wrap { position: fixed; top: 68px; left: 50%; transform: translateX(-50%); z-index: 200; animation: gsToastIn 0.15s ease; }
  @keyframes gsToastIn { from { opacity:0; transform: translateX(-50%) translateY(-5px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
  .gs-toast { display: flex; align-items: center; gap: 9px; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: inherit; border: 1.5px solid; white-space: nowrap; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .gs-toast.success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .gs-toast.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .gs-toast-close { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.5; padding: 0; margin-left: 2px; display: flex; align-items: center; }
  .gs-toast-close:hover { opacity: 1; }

  /* Page head */
  .gs-page-title { font-size: 18px; font-weight: 750; letter-spacing: -0.4px; color: #0a0a0a; margin: 0 0 4px; }
  .gs-page-sub { font-size: 13px; color: #64748b; margin: 0 0 28px; }

  /* Card */
  .gs-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 22px 24px; margin-bottom: 20px; }

  /* Field */
  .gs-field { margin-bottom: 20px; }
  .gs-label { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; margin-bottom: 8px; }
  .gs-input {
    width: 100%; height: 40px; padding: 0 14px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit;
    color: #0a0a0a; background: #fafafa; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .gs-input:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .gs-input::placeholder { color: #94a3b8; }
  .gs-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

  .gs-textarea {
    width: 100%; padding: 10px 14px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit;
    color: #0a0a0a; background: #fafafa; outline: none; resize: none;
    line-height: 1.55;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .gs-textarea:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .gs-textarea:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

  .gs-card-footer { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1.5px solid #f1f5f9; margin-top: 4px; }
  .gs-save-btn {
    height: 38px; padding: 0 20px;
    background: #0a0a0a; color: #fff;
    border: none; border-radius: 8px;
    font-size: 13.5px; font-weight: 650;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 7px;
    transition: background 0.15s, transform 0.1s;
  }
  .gs-save-btn:hover { background: #1e293b; }
  .gs-save-btn:active { transform: scale(0.98); }
  .gs-save-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; transform: none; }

  /* Danger zone */
  .gs-danger-zone {
    background: #fff; border: 1.5px solid #fecaca; border-radius: 12px; padding: 20px 24px;
  }
  .gs-danger-title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: #dc2626; margin: 0 0 6px; }
  .gs-danger-desc { font-size: 13px; color: #b91c1c; margin: 0 0 16px; line-height: 1.55; }
  .gs-danger-btn {
    height: 36px; padding: 0 16px;
    background: #fff; border: 1.5px solid #fca5a5; border-radius: 8px;
    font-size: 13px; font-weight: 600; color: #dc2626;
    cursor: pointer; font-family: inherit;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .gs-danger-btn:hover { background: #dc2626; color: #fff; border-color: #dc2626; }
  .gs-danger-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Modal */
  .gs-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,23,42,0.5); backdrop-filter: blur(4px);
    z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .gs-modal {
    background: #fff; border-radius: 14px; border: 1.5px solid #e2e8f0;
    box-shadow: 0 24px 64px rgba(0,0,0,0.14); padding: 28px;
    max-width: 420px; width: 100%; animation: gsModalIn 0.15s ease;
  }
  @keyframes gsModalIn { from { opacity:0; transform: scale(0.97) translateY(4px); } to { opacity:1; transform: scale(1) translateY(0); } }
  .gs-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .gs-modal-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 750; color: #0a0a0a; letter-spacing: -0.2px; }
  .gs-modal-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .gs-modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; border-radius: 6px; display: flex; align-items: center; transition: color 0.1s; }
  .gs-modal-close:hover { color: #475569; }
  .gs-modal-body { font-size: 13px; color: #64748b; line-height: 1.65; margin-bottom: 18px; }
  .gs-modal-body strong { color: #0a0a0a; font-weight: 650; }
  .gs-modal-body .danger { color: #dc2626; font-weight: 650; }
  .gs-modal-input {
    width: 100%; height: 40px; padding: 0 14px; margin-bottom: 12px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13.5px; font-family: inherit; color: #0a0a0a; background: #fafafa; outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .gs-modal-input:focus { background: #fff; }
  .gs-modal-input.save:focus { border-color: #2563eb; }
  .gs-modal-input.delete:focus { border-color: #dc2626; }
  .gs-modal-input::placeholder { color: #cbd5e1; }
  .gs-modal-btn {
    width: 100%; height: 40px;
    border: none; border-radius: 8px;
    font-size: 13.5px; font-weight: 650;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .gs-modal-btn.save { background: #0a0a0a; color: #fff; }
  .gs-modal-btn.save:hover:not(:disabled) { background: #1e293b; }
  .gs-modal-btn.delete { background: #dc2626; color: #fff; }
  .gs-modal-btn.delete:hover:not(:disabled) { background: #b91c1c; }
  .gs-modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  @keyframes gs-spin { to { transform: rotate(360deg); } }
`;

const GsToast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="gs-toast-wrap">
      <div className={`gs-toast ${type}`}>
        {type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
        {message}
        <button className="gs-toast-close" onClick={onClose}><X size={14} /></button>
      </div>
    </div>
  );
};

const GeneralSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { refreshWorkspaces, isAdmin } = useOutletContext();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveText, setSaveText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await api.get(`workspaces/${workspaceId}/`);
        setName(r.data.name);
        setDescription(r.data.description || '');
      } catch {
        setToast({ message: "Failed to load workspace settings", type: "error" });
      } finally { setLoading(false); }
    };
    fetch();
  }, [workspaceId]);

  const showToast = (message, type) => setToast({ message, type });

  const initiateSave = () => {
    if (!isAdmin) { showToast("Action allowed only for admin.", "error"); return; }
    setSaveText(''); setShowSaveModal(true);
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      await api.patch(`workspaces/${workspaceId}/`, { name, description });
      setShowSaveModal(false);
      showToast("Settings updated successfully!", "success");
      if (refreshWorkspaces) refreshWorkspaces();
    } catch (e) {
      showToast(e.response?.data?.name?.[0] || "Failed to update workspace", "error");
    } finally { setSaving(false); }
  };

  const initiateDelete = () => {
    if (!isAdmin) { showToast("Action allowed only for admin.", "error"); return; }
    setDeleteText(''); setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`workspaces/${workspaceId}/`);
      if (refreshWorkspaces) refreshWorkspaces();
      setShowDeleteModal(false);
      showToast("Workspace deleted successfully", "success");
      setTimeout(() => navigate('/app'), 1000);
    } catch {
      showToast("Failed to delete workspace", "error");
      setDeleting(false);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Geist,sans-serif' }}>Loading settings…</div>;

  return (
    <div className="gs-root">
      <style>{styles}</style>
      {toast && <GsToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Save modal */}
      {showSaveModal && (
        <div className="gs-modal-overlay">
          <div className="gs-modal">
            <div className="gs-modal-head">
              <div className="gs-modal-title">
                <div className="gs-modal-icon" style={{ background: '#eff6ff' }}>
                  <CheckCircle size={15} style={{ color: '#2563eb' }} />
                </div>
                Confirm Changes
              </div>
              <button className="gs-modal-close" onClick={() => setShowSaveModal(false)}><X size={16} /></button>
            </div>
            <div className="gs-modal-body">
              You're about to update core workspace details. Type <strong>save changes</strong> to confirm.
            </div>
            <input
              className="gs-modal-input save"
              value={saveText}
              onChange={(e) => setSaveText(e.target.value)}
              placeholder="save changes"
              autoFocus
            />
            <button
              className="gs-modal-btn save"
              onClick={executeSave}
              disabled={saveText !== 'save changes' || saving}
            >
              {saving ? "Saving…" : "Confirm & Save"}
            </button>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="gs-modal-overlay">
          <div className="gs-modal">
            <div className="gs-modal-head">
              <div className="gs-modal-title">
                <div className="gs-modal-icon" style={{ background: '#fef2f2' }}>
                  <Trash2 size={15} style={{ color: '#dc2626' }} />
                </div>
                Delete Workspace
              </div>
              <button className="gs-modal-close" onClick={() => setShowDeleteModal(false)}><X size={16} /></button>
            </div>
            <div className="gs-modal-body">
              This will permanently delete the workspace, all systems, evaluations, and data.
              This action <span className="danger">cannot be undone</span>.<br /><br />
              Type <strong>delete workspace</strong> to confirm.
            </div>
            <input
              className="gs-modal-input delete"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="delete workspace"
              autoFocus
            />
            <button
              className="gs-modal-btn delete"
              onClick={executeDelete}
              disabled={deleteText !== 'delete workspace' || deleting}
            >
              {deleting ? "Deleting…" : "Delete Workspace Permanently"}
            </button>
          </div>
        </div>
      )}

      <h2 className="gs-page-title">General Settings</h2>
      <p className="gs-page-sub">Manage your workspace's core details and preferences.</p>

      <div className="gs-card">
        <div className="gs-field">
          <label className="gs-label"><Building size={12} /> Workspace Name</label>
          <input
            className="gs-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            placeholder="Workspace name"
          />
        </div>
        <div className="gs-field" style={{ marginBottom: 0 }}>
          <label className="gs-label"><FileText size={12} /> Description</label>
          <textarea
            className="gs-textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdmin}
            placeholder="What is this workspace for?"
          />
        </div>
        <div className="gs-card-footer">
          <button className="gs-save-btn" onClick={initiateSave} disabled={saving || !isAdmin}>
            {saving
              ? <><span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'gs-spin 0.7s linear infinite', display:'inline-block' }} /> Saving…</>
              : 'Save Changes'
            }
          </button>
        </div>
      </div>

      <div className="gs-danger-zone">
        <h3 className="gs-danger-title"><Trash2 size={15} /> Danger Zone</h3>
        <p className="gs-danger-desc">
          Deleting this workspace will permanently remove all associated systems, evaluations, and data. This action cannot be undone.
        </p>
        <button className="gs-danger-btn" onClick={initiateDelete} disabled={!isAdmin}>
          Delete Workspace
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings;
