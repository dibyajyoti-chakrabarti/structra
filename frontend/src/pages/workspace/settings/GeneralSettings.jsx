import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Trash2, Globe, Building } from 'lucide-react';
import api from '../../../api';

const GeneralSettings = () => {
  const { workspaceId } = useParams(); // Retrieves ID from App.jsx route
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current workspace data on mount
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const response = await api.get(`workspaces/${workspaceId}/`);
        setName(response.data.name);
        setDescription(response.data.description || '');
      } catch (error) {
        console.error("Failed to load workspace settings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, [workspaceId]);

  // Update Workspace (PATCH)
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`workspaces/${workspaceId}/`, {
        name,
        description
      });
      alert("Settings updated successfully.");
    } catch (error) {
      console.error("Update failed", error);
      alert(error.response?.data?.name?.[0] || "Failed to update workspace.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Workspace (DELETE)
  const handleDelete = async () => {
    if (window.confirm("Are you sure? This will delete all systems and evaluations permanently.")) {
      try {
        await api.delete(`workspaces/${workspaceId}/`);
        navigate('/app/home');
      } catch (error) {
        console.error("Deletion failed", error);
      }
    }
  };

  if (loading) return <div className="p-8 text-gray-400 font-medium">Loading settings...</div>;

  return (
    <div className="h-full flex flex-col max-w-3xl">
       <div className="mb-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            General Settings
          </h2>
          <p className="text-gray-500 mt-2 text-sm lg:text-base">
            Manage your workspace's core details and preferences.
          </p>
       </div>

       <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
               <Building size={14} className="text-gray-400" /> 
               Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-base font-medium text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
               <Globe size={14} className="text-gray-400" /> 
               Description
            </label>
            <textarea
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none font-medium text-gray-600"
            ></textarea>
          </div>
          
          <div className="pt-4 flex justify-end">
             <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
             >
                <Save size={18} />
                {saving ? "Saving..." : "Save Changes"}
             </button>
          </div>
       </div>

       <div className="my-10 border-t border-gray-100"></div>

       <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <h3 className="text-red-900 font-bold text-lg mb-2 flex items-center gap-2">
             <Trash2 size={20} />
             Danger Zone
          </h3>
          <p className="text-red-700 text-sm mb-6">
             Deleting this workspace will permanently remove all associated systems, evaluations, and data. This action cannot be undone.
          </p>
          <div className="flex justify-end sm:justify-start">
            <button 
              onClick={handleDelete}
              className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm"
            >
                Delete Workspace
            </button>
          </div>
       </div>
    </div>
  );
};

export default GeneralSettings;