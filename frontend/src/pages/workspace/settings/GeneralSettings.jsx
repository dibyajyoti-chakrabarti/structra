import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Save, Trash2, Globe, Building, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../api';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-2 ${
        type === 'success' 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        {type === 'success' ? (
          <CheckCircle size={20} className="text-green-600" />
        ) : (
          <AlertCircle size={20} className="text-red-600" />
        )}
        <span className="font-semibold">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

const GeneralSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { refreshWorkspaces } = useOutletContext();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveConfirmationText, setSaveConfirmationText] = useState('');

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch current workspace data
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const response = await api.get(`workspaces/${workspaceId}/`);
        setName(response.data.name);
        setDescription(response.data.description || '');
      } catch (error) {
        console.error("Failed to load workspace settings", error);
        setToast({ message: "Failed to load workspace settings", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, [workspaceId]);

  // Show toast notification
  const showToast = (message, type) => {
    setToast({ message, type });
  };

  // Open Save Modal
  const initiateSave = () => {
    setSaveConfirmationText('');
    setShowSaveModal(true);
  };

  // Execute Save
  const executeSave = async () => {
    setSaving(true);
    try {
      await api.patch(`workspaces/${workspaceId}/`, {
        name,
        description
      });
      
      setShowSaveModal(false);
      showToast("Settings updated successfully!", "success");

      if (refreshWorkspaces) {
        refreshWorkspaces();
      }

    } catch (error) {
      console.error("Update failed", error);
      showToast(error.response?.data?.name?.[0] || "Failed to update workspace", "error");
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Modal
  const initiateDelete = () => {
    setDeleteConfirmationText('');
    setShowDeleteModal(true);
  };

  // Execute Delete
  const executeDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`workspaces/${workspaceId}/`);
      
      if (refreshWorkspaces) refreshWorkspaces();
      
      setShowDeleteModal(false);
      showToast("Workspace deleted successfully", "success");
      
      // Navigate after a brief delay to show the toast
      setTimeout(() => {
        navigate('/app/home');
      }, 1000);
    } catch (error) {
      console.error("Deletion failed", error);
      showToast("Failed to delete workspace", "error");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading settings...</div>;

  return (
    <div className="relative max-w-3xl">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* SAVE CONFIRMATION MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-extrabold text-gray-900">Confirm Changes</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              You are about to modify core workspace details. To confirm, please type <span className="font-bold text-gray-900 select-none">save changes</span> below.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={saveConfirmationText}
                onChange={(e) => setSaveConfirmationText(e.target.value)}
                placeholder="Type 'save changes'"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none font-medium text-gray-900 placeholder:text-gray-300 transition-all"
                autoFocus
              />

              <button 
                onClick={executeSave}
                disabled={saveConfirmationText !== 'save changes' || saving}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {saving ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Delete Workspace</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-2 leading-relaxed">
              This action <span className="font-bold text-red-600">cannot be undone</span>. This will permanently delete the workspace, all systems, evaluations, and data.
            </p>

            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              To confirm, please type <span className="font-bold text-gray-900 select-none">delete workspace</span> below.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type 'delete workspace'"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-red-500 focus:ring-0 outline-none font-medium text-gray-900 placeholder:text-gray-300 transition-all"
                autoFocus
              />

              <button 
                onClick={executeDelete}
                disabled={deleteConfirmationText !== 'delete workspace' || deleting}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {deleting ? "Deleting..." : "Delete Workspace Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          General Settings
        </h2>
        <p className="text-gray-500 mt-1.5 text-sm">
          Manage your workspace's core details and preferences.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Building size={14} className="text-gray-400" /> 
            Workspace Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm text-gray-900"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Globe size={14} className="text-gray-400" /> 
            Description
          </label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none text-sm text-gray-700"
          ></textarea>
        </div>
        
        <div className="pt-2 flex justify-end">
          <button 
            onClick={initiateSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>

      <div className="my-8 border-t border-gray-200"></div>

      <div className="rounded-xl border border-red-200 bg-white p-5">
        <h3 className="text-red-700 font-semibold text-base mb-2 flex items-center gap-2">
          <Trash2 size={18} />
          Danger Zone
        </h3>
        <p className="text-red-700 text-sm mb-4">
          Deleting this workspace will permanently remove all associated systems, evaluations, and data. This action cannot be undone.
        </p>
        <div className="flex justify-end sm:justify-start">
          <button 
            onClick={initiateDelete}
            className="bg-white border border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
