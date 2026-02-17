import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save,
  UserPlus,
  CheckCircle,
  Search,
  Circle,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import api from "../../api";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "commenter", label: "Commenter" },
  { value: "editor", label: "Editor" },
];

const CreateSystem = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const [systemName, setSystemName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingMembers(true);
      try {
        const [workspaceRes, membersRes] = await Promise.all([
          api.get(`workspaces/${workspaceId}/`),
          api.get(`workspaces/${workspaceId}/members/`),
        ]);

        setIsAdmin(!!workspaceRes.data?.is_admin);
        setWorkspaceMembers(membersRes.data || []);
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.detail || "Failed to load workspace members.");
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return workspaceMembers;
    return workspaceMembers.filter(
      (member) =>
        (member.full_name || "").toLowerCase().includes(query) ||
        (member.email || "").toLowerCase().includes(query)
    );
  }, [workspaceMembers, searchQuery]);

  const toggleMember = (userId) => {
    setSelectedMembers((prev) => {
      const next = { ...prev };
      if (next[userId]) {
        delete next[userId];
      } else {
        next[userId] = "viewer";
      }
      return next;
    });
  };

  const updateMemberRole = (userId, role) => {
    setSelectedMembers((prev) => ({ ...prev, [userId]: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      setError("Only workspace admins can create systems.");
      return;
    }

    if (!systemName.trim()) {
      setError("System name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const memberPermissions = Object.entries(selectedMembers).map(([user_id, role]) => ({
        user_id,
        role,
      }));

      const payload = {
        name: systemName.trim(),
        description: description.trim(),
        member_permissions: memberPermissions,
      };

      await api.post(`workspaces/${workspaceId}/canvases/`, payload);
      navigate(`/app/ws/${workspaceId}`);
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.name) {
          setError(`Name: ${errorData.name[0]}`);
        } else if (errorData.detail) {
          setError(errorData.detail);
        } else if (errorData.error) {
          setError(errorData.error);
        } else if (errorData.member_permissions) {
          setError(Array.isArray(errorData.member_permissions) ? errorData.member_permissions[0] : errorData.member_permissions);
        } else if (errorData.non_field_errors) {
          setError(errorData.non_field_errors[0]);
        } else {
          setError("Failed to create system. Please try again.");
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/app/ws/${workspaceId}`);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-160px)] gap-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="w-full lg:flex-[2] flex flex-col pr-0 lg:pr-12 mb-8 lg:mb-0">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Create New System</h1>
          <p className="text-gray-500 mt-2 text-sm lg:text-base">
            Configure the core parameters for your system model.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!loadingMembers && !isAdmin && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Admin Access Required</p>
              <p className="text-sm text-amber-700">Only workspace admins can create systems.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-visible lg:overflow-y-auto lg:pr-4 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider">
              System Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="e.g. Neural Link Architecture"
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-base"
              required
              disabled={loading || !isAdmin}
            />
          </div>

          <div className="space-y-2 flex flex-col lg:h-auto">
            <label className="text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Operational Description
            </label>
            <textarea
              rows="6"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the system's objective and scope..."
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none lg:flex-1"
              disabled={loading || !isAdmin}
            ></textarea>
          </div>
        </form>

        <div className="pt-6 lg:pt-8 flex justify-end gap-4 border-t border-gray-100 mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 lg:flex-none px-6 lg:px-8 py-2.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !systemName.trim() || !isAdmin}
            className="flex-1 lg:flex-none bg-blue-600 text-white px-6 lg:px-10 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="whitespace-nowrap">Creating...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span className="whitespace-nowrap">Save System</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="hidden lg:block w-px bg-gray-100 h-full"></div>

      <div className="w-full lg:flex-1 flex flex-col pl-0 lg:pl-12 border-t lg:border-t-0 border-gray-100 pt-8 lg:pt-0">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Team Access
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select workspace members and assign role for initial system access.
          </p>
        </div>

        <div className="relative group mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find member by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-md border border-gray-200 group-focus-within:bg-white group-focus-within:border-blue-400 group-focus-within:ring-2 group-focus-within:ring-blue-100 outline-none transition"
            disabled={loadingMembers || !isAdmin}
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>

        <div className="flex-1 bg-gray-50 rounded-t-xl border-x border-t border-gray-200 flex flex-col overflow-hidden h-64 lg:h-auto">
          <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workspace Members</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {Object.keys(selectedMembers).length} Selected
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {loadingMembers ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No members found matching "{searchQuery}"
              </div>
            ) : (
              filteredMembers.map((member) => {
                const userId = member.user_id;
                const isSelected = !!selectedMembers[userId];
                return (
                  <div
                    key={userId}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div
                      onClick={() => isAdmin && toggleMember(userId)}
                      className={`flex items-center justify-between ${isAdmin ? "cursor-pointer" : "cursor-not-allowed"}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {(member.full_name || member.email || "U")[0]}
                        </div>
                        <div className="flex flex-col truncate">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isSelected ? "text-blue-900" : "text-gray-700"
                            }`}
                          >
                            {member.full_name || member.email}
                          </span>
                          <span className="text-xs text-gray-400 truncate">{member.email}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
                      ) : (
                        <Circle size={20} className="text-gray-300 flex-shrink-0" />
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-3 pl-11">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Role</label>
                        <select
                          value={selectedMembers[userId]}
                          onChange={(e) => updateMemberRole(userId, e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-blue-200 bg-white text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSystem;
