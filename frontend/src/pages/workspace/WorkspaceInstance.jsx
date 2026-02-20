import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Menu, Settings, Trash2, X, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import AuthenticatedNavbar from "../../components/AuthenticatedNavbar";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import api from "../../api";

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

const WorkspaceInstance = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopNavbarCollapsed, setIsDesktopNavbarCollapsed] = useState(false);
  
  // Lifted State: Manage workspaces globally for this layout
  const [workspaces, setWorkspaces] = useState([]);
  const [areWorkspacesLoading, setAreWorkspacesLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const response = await api.get('workspaces/');
      setWorkspaces(response.data);
    } catch (error) {
      console.error("Failed to fetch workspaces", error);
    } finally {
      setAreWorkspacesLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <AuthenticatedNavbar />

      <div className="md:hidden border-b border-gray-100 p-4 flex items-center gap-3 bg-white">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg"
        >
          <Menu size={24} />
        </button>
        <span className="font-semibold text-gray-900">Workspace Menu</span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <WorkspaceNavbar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          workspaces={workspaces}
          loading={areWorkspacesLoading}
          isDesktopCollapsed={isDesktopNavbarCollapsed}
          onDesktopToggle={() => setIsDesktopNavbarCollapsed((prev) => !prev)}
        />

        {isDesktopNavbarCollapsed && (
          <div className="hidden md:flex w-12 shrink-0 border-r border-gray-100 bg-white items-start justify-center pt-4">
            <button
              onClick={() => setIsDesktopNavbarCollapsed(false)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
              aria-label="Expand workspace sidebar"
              title="Expand workspace sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <main className={`flex-1 overflow-hidden bg-white w-full relative z-0 ${isDesktopNavbarCollapsed ? "" : "md:border-l border-gray-100"}`}>
          <div className={`h-full w-full mx-auto p-4 md:p-10 overflow-y-auto ${isDesktopNavbarCollapsed ? "max-w-none" : "max-w-[1600px]"}`}>
            <Outlet context={{ refreshWorkspaces: fetchWorkspaces }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export const WorkspaceOverview = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemsLoading, setSystemsLoading] = useState(true);

  // Toast State
  const [toast, setToast] = useState(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [systemToDelete, setSystemToDelete] = useState(null);

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      try {
        const response = await api.get(`workspaces/${workspaceId}/`);
        setWorkspace(response.data);
      } catch (error) {
        console.error("Failed to fetch workspace details:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSystems = async () => {
      try {
        const response = await api.get(`workspaces/${workspaceId}/canvases/`);
        setSystems(response.data);
      } catch (error) {
        console.error("Failed to fetch systems:", error);
      } finally {
        setSystemsLoading(false);
      }
    };

    fetchWorkspaceDetails();
    fetchSystems();
  }, [workspaceId]);

  // Show toast notification
  const showToast = (message, type) => {
    setToast({ message, type });
  };

  // Open Delete Modal
  const initiateDelete = (system, e) => {
    e.stopPropagation(); // Prevent navigation to system
    setSystemToDelete(system);
    setDeleteConfirmationText('');
    setShowDeleteModal(true);
  };

  // Execute Delete
  const executeDelete = async () => {
    if (!systemToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`workspaces/${workspaceId}/canvases/${systemToDelete.id}/`);
      
      // Remove system from local state
      setSystems(systems.filter(s => s.id !== systemToDelete.id));
      
      setShowDeleteModal(false);
      setSystemToDelete(null);
      showToast("System deleted successfully", "success");
    } catch (error) {
      console.error("Deletion failed", error);
      showToast("Failed to delete system", "error");
    } finally {
      setDeleting(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1d ago";
    return `${diffDays}d ago`;
  };

  if (loading) return <div className="p-10 text-gray-400">Loading workspace details...</div>;
  if (!workspace) return <div className="p-10 text-red-500">Workspace not found.</div>;

  const stats = [
    { label: "Total Systems", value: systems.length.toString() },
    { label: "Active Evaluations", value: "0" },
    { label: "Team Members", value: workspace.member_count || "1" },
  ];

  return (
    <div className="pb-10">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
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
                <h3 className="text-xl font-extrabold text-gray-900">Delete System</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-2 leading-relaxed">
              This action <span className="font-bold text-red-600">cannot be undone</span>. This will permanently delete the system <span className="font-bold text-gray-900">{systemToDelete?.name}</span> and all associated data.
            </p>

            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              To confirm, please type <span className="font-bold text-gray-900 select-none">delete system</span> below.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type 'delete system'"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-red-500 focus:ring-0 outline-none font-medium text-gray-900 placeholder:text-gray-300 transition-all"
                autoFocus
              />

              <button 
                onClick={executeDelete}
                disabled={deleteConfirmationText !== 'delete system' || deleting}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {deleting ? "Deleting..." : "Delete System Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {workspace.name}
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            {workspace.description || "Overview of your systems and evaluations."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}/settings`)}
            className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
          >
            <Settings size={20} />
          </button>

          {workspace.is_admin && (
            <button
              onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)}
              className="w-full md:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New System
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-5 md:p-6 rounded-xl border border-gray-200"
          >
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Systems</h2>
      
      {systemsLoading ? (
        <div className="text-center py-10 text-gray-400">Loading systems...</div>
      ) : systems.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {systems.map((system) => (
            <div
              key={system.id}
              onClick={() => navigate(`/app/ws/${workspaceId}/systems/${system.id}`)}
            className="bg-white p-4 rounded-md border border-gray-200 flex justify-between items-center hover:border-blue-300 transition-colors cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-gray-900 text-sm md:text-base">
                    {system.name}
                  </h3>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                      system.visibility === "public"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {system.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-gray-500">
                  Last updated {formatTimeAgo(system.updated_at)}
                </p>
              </div>
              <button
                onClick={(e) => initiateDelete(system, e)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Delete system"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium mb-4">No systems yet</p>
          {workspace.is_admin ? (
            <button
              onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              + Create Your First System
            </button>
          ) : (
            <p className="text-sm text-gray-400">
              Ask a workspace admin to create a system and grant you access.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkspaceInstance;
