import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Shield, Globe, Lock, ChevronDown, ChevronUp, Plus, Trash2, Save, Search } from 'lucide-react';
import api from '../../../api';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'editor', label: 'Editor' },
];

const roleLabel = (role) => {
  const match = ROLE_OPTIONS.find((option) => option.value === role);
  return match ? match.label : role;
};

const SecuritySettings = () => {
  const { workspaceId } = useParams();
  const { isAdmin } = useOutletContext();

  const [systems, setSystems] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [expandedSystem, setExpandedSystem] = useState(null);
  const [grantForms, setGrantForms] = useState({});
  const [loadingIam, setLoadingIam] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const defaultForm = useMemo(
    () => ({ query: '', selectedUserId: '', role: 'viewer', submitting: false, openPicker: false }),
    []
  );

  const showAdminOnlyError = () => {
    setError('Action allowed only for admin.');
    setTimeout(() => setError(''), 2500);
  };

  const fetchWorkspaceVisibility = async () => {
    try {
      const response = await api.get(`workspaces/${workspaceId}/`);
      setVisibility(response.data?.visibility || 'private');
    } catch {
      setError('Failed to load workspace visibility.');
    }
  };

  const fetchWorkspaceMembers = async () => {
    if (!isAdmin) {
      setWorkspaceMembers([]);
      return;
    }

    try {
      const [membersRes, profileRes] = await Promise.all([
        api.get(`workspaces/${workspaceId}/members/`),
        api.get('auth/profile/'),
      ]);
      const userId = profileRes.data?.user_id || '';
      setCurrentUserId(userId);
      setWorkspaceMembers((membersRes.data || []).filter((member) => member.user_id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to load workspace members.');
    }
  };

  const fetchIamPolicies = async () => {
    if (!isAdmin) {
      setSystems([]);
      setLoadingIam(false);
      return;
    }

    setLoadingIam(true);
    try {
      const response = await api.get(`workspaces/${workspaceId}/system-permissions/`);
      const fetchedSystems = response.data || [];
      setSystems(fetchedSystems);
      setExpandedSystem((current) => {
        if (current && fetchedSystems.some((system) => system.system_id === current)) {
          return current;
        }
        return fetchedSystems.length > 0 ? fetchedSystems[0].system_id : null;
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to load IAM policies.');
    } finally {
      setLoadingIam(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceVisibility();
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspaceMembers();
    fetchIamPolicies();
  }, [workspaceId, isAdmin]);

  useEffect(() => {
    const onPointerDown = (event) => {
      const insidePicker = event.target?.closest?.('[data-member-picker="true"]');
      if (!insidePicker) {
        setGrantForms((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((systemId) => {
            if (next[systemId]?.openPicker) {
              next[systemId] = { ...next[systemId], openPicker: false };
            }
          });
          return next;
        });
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const toggleSystem = (id) => {
    if (expandedSystem === id) setExpandedSystem(null);
    else setExpandedSystem(id);
  };

  const applyVisibilityChanges = async () => {
    if (!isAdmin) {
      showAdminOnlyError();
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.patch(`workspaces/${workspaceId}/`, { visibility });
      setSuccess('Workspace visibility updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to update workspace visibility.');
    }
  };

  const updateGrantForm = (systemId, updates) => {
    setGrantForms((prev) => ({
      ...prev,
      [systemId]: { ...(prev[systemId] || defaultForm), ...updates },
    }));
  };

  const getFilteredMembers = (systemId) => {
    const form = grantForms[systemId] || defaultForm;
    const query = (form.query || '').trim().toLowerCase();
    const grantedUserIds = new Set(
      (systems.find((system) => system.system_id === systemId)?.permissions || []).map((perm) => perm.user_id)
    );

    return workspaceMembers
      .filter((member) => member.user_id !== currentUserId)
      .filter((member) => !grantedUserIds.has(member.user_id))
      .filter((member) => {
        if (!query) return true;
        return (
          (member.full_name || '').toLowerCase().includes(query) ||
          (member.email || '').toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  };

  const getSelectedMember = (systemId) => {
    const form = grantForms[systemId] || defaultForm;
    if (form.selectedUserId) {
      return workspaceMembers.find((member) => member.user_id === form.selectedUserId) || null;
    }

    const query = (form.query || '').trim().toLowerCase();
    if (!query) return null;

    const exactEmailMatch = workspaceMembers.find((member) => (member.email || '').toLowerCase() === query);
    return exactEmailMatch || null;
  };

  const handleSelectMember = (systemId, member) => {
    updateGrantForm(systemId, {
      query: member.email,
      selectedUserId: member.user_id,
      openPicker: false,
    });
  };

  const handleGrantAccess = async (systemId) => {
    if (!isAdmin) {
      showAdminOnlyError();
      return;
    }

    const form = grantForms[systemId] || defaultForm;
    const selectedMember = getSelectedMember(systemId);

    if (!selectedMember) {
      setError('Select a workspace member to grant system access.');
      return;
    }

    setError('');
    setSuccess('');
    updateGrantForm(systemId, { submitting: true });

    try {
      const response = await api.post(`workspaces/${workspaceId}/systems/${systemId}/permissions/`, {
        user_id: selectedMember.user_id,
        role: form.role,
      });
      setSuccess(response.data?.message || 'System access granted successfully.');
      updateGrantForm(systemId, { query: '', selectedUserId: '', submitting: false, openPicker: false });
      await fetchIamPolicies();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to grant system access.');
      updateGrantForm(systemId, { submitting: false });
    }
  };

  const handleRevokeAccess = async (systemId, userId) => {
    if (!isAdmin) {
      showAdminOnlyError();
      return;
    }

    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`workspaces/${workspaceId}/systems/${systemId}/permissions/${userId}/`);
      setSuccess(response.data?.message || 'System access revoked successfully.');
      await fetchIamPolicies();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to revoke system access.');
    }
  };

  return (
    <div className="flex flex-col max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Security & Permissions</h2>
        <p className="text-gray-500 mt-1.5 text-sm">
          Configure visibility and granular system access control.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe size={20} className="text-blue-600" />
          Workspace Visibility
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Access Level
            </label>
            <div className="relative">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={!isAdmin}
                className={`w-full appearance-none px-3.5 py-2.5 rounded-md border font-medium text-sm transition-all ${
                  isAdmin
                    ? 'bg-white border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer'
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <option value="private">Private - Invite only</option>
                <option value="public">Public - Visible to anyone</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>
          <button
            type="button"
            onClick={applyVisibilityChanges}
            className={`w-full md:w-auto px-5 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isAdmin
                ? 'bg-gray-900 text-white hover:bg-black'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            Apply Changes
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="flex-1 pb-10">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              IAM (Identity & Access Management)
            </h3>
          </div>

          {loadingIam ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">Loading IAM policies...</div>
          ) : systems.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              No systems found in this workspace yet.
            </div>
          ) : (
            <div className="space-y-4">
              {systems.map((system) => {
                const form = grantForms[system.system_id] || defaultForm;
                const selectedMember = getSelectedMember(system.system_id);
                const filteredMembers = getFilteredMembers(system.system_id);

                return (
                  <div
                    key={system.system_id}
                    className="border border-gray-200 rounded-xl overflow-visible transition-colors bg-white hover:border-blue-200"
                  >
                    <div
                      onClick={() => toggleSystem(system.system_id)}
                      className="p-4 flex items-center justify-between cursor-pointer bg-white select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-md transition-colors ${
                            expandedSystem === system.system_id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Lock size={16} />
                        </div>
                        <span
                          className={`font-medium text-base ${
                            expandedSystem === system.system_id ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {system.system_name}
                        </span>
                      </div>
                      {expandedSystem === system.system_id ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>

                    {expandedSystem === system.system_id && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/70">
                        <div className="space-y-3 mb-6">
                          {system.permissions?.length > 0 ? (
                            system.permissions.map((user) => (
                              <div
                                key={user.user_id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-md border border-gray-200 gap-3 group hover:border-blue-300 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs border border-blue-100">
                                    {(user.full_name || user.email || 'U')[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{user.full_name || user.email}</p>
                                    <p className="text-xs text-gray-500 font-medium">
                                      {user.email} <span className="text-gray-300 px-1">|</span>{' '}
                                      <span className="text-blue-600">{roleLabel(user.role)}</span>
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeAccess(system.system_id, user.user_id)}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all self-end sm:self-center"
                                  title="Revoke Access"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 border border-dashed border-gray-300 rounded-md">
                              <p className="text-sm text-gray-400 font-medium">No access policy set for this system.</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Workspace members without explicit policy cannot see this system.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="bg-white p-4 rounded-md border border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                            Grant Access to {system.system_name}
                          </h4>

                          <div className="flex flex-col md:flex-row gap-3 items-start">
                            <div className="flex-[2] w-full relative" data-member-picker="true">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={form.query}
                                  onFocus={(e) =>
                                    updateGrantForm(system.system_id, {
                                      openPicker: true,
                                    })
                                  }
                                  onChange={(e) =>
                                    updateGrantForm(system.system_id, {
                                      query: e.target.value,
                                      selectedUserId: '',
                                      openPicker: true,
                                    })
                                  }
                                  placeholder="Search member by name or email..."
                                  className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                                />
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>

                              {form.openPicker && (
                                <div className="mt-1 w-full rounded-md border border-gray-200 bg-white">
                                  {filteredMembers.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-gray-500">
                                      No workspace members match your search.
                                    </p>
                                  ) : (
                                    filteredMembers.map((member) => (
                                      <button
                                        key={member.user_id}
                                        type="button"
                                        onClick={() => handleSelectMember(system.system_id, member)}
                                        className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0 border-gray-100"
                                      >
                                        <p className="text-sm font-medium text-gray-800">{member.full_name || member.email}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}

                              {selectedMember && (
                                <p className="mt-1 text-xs text-green-600">Selected: {selectedMember.email}</p>
                              )}
                            </div>

                            <div className="flex-1 relative min-w-[140px] w-full md:w-auto">
                              <select
                                value={form.role}
                                onChange={(e) => updateGrantForm(system.system_id, { role: e.target.value })}
                                className="w-full appearance-none px-3.5 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm bg-white text-gray-600 cursor-pointer"
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>

                            <button
                              type="button"
                              disabled={form.submitting}
                              onClick={() => handleGrantAccess(system.system_id)}
                              className="bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {form.submitting ? '...' : <Plus size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-500 text-sm">
          IAM options are available only to workspace admins.
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
