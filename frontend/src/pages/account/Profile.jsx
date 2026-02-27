import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for redirection
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import { User, Mail, MapPin, Calendar, Building, Globe, Lock, ArrowRight, Settings, Check, X, Camera, Edit2, Copy, Star, Search, AtSign } from 'lucide-react';
import api from '../../api';
import { formatDistanceToNow } from 'date-fns'; // Added for relative time formatting
import LoadingState from '../../components/LoadingState';

const USERNAME_REGEX = /^[A-Za-z0-9_-]+$/;

export default function Profile() {
  const navigate = useNavigate(); // Hook for navigation
  
  // State for user and workspaces data
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]); // Replaces the hardcoded array
  const [loading, setLoading] = useState(true);
  const [starringWorkspaceIds, setStarringWorkspaceIds] = useState([]);
  const [workspaceSearchInput, setWorkspaceSearchInput] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [debouncedUserSearchInput, setDebouncedUserSearchInput] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Email Copy State
  const [emailCopied, setEmailCopied] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearchInput(userSearchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  // Helper: Format Date
  const formatDate = (isoString) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Fetch Profile and Workspaces Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile and workspaces concurrently
        const [profileRes, workspaceRes] = await Promise.all([
          api.get('auth/profile/'),
          api.get('workspaces/')
        ]);

        const userData = {
          id: profileRes.data.user_id,
          name: profileRes.data.full_name,
          username: profileRes.data.username || "",
          email: profileRes.data.email,
          role: profileRes.data.user_role || "Role not set",
          organization: profileRes.data.org_name || "Organization not set",
          location: profileRes.data.org_loc || "Location not set",
          joined: formatDate(profileRes.data.created_at),
          avatar: null,
          followers_count: profileRes.data.followers_count || 0,
          following_count: profileRes.data.following_count || 0,
        };
        
        setUser(userData);
        setFormData(userData);
        setWorkspaces(workspaceRes.data); // Set real workspace data
      } catch (err) {
        console.error("Failed to load profile or workspaces", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const query = debouncedUserSearchInput.replace(/^@+/, '');
    if (!query) {
      setUserSearchResults([]);
      setUserSearchError('');
      setIsUserSearchLoading(false);
      return;
    }

    let cancelled = false;
    setIsUserSearchLoading(true);
    setUserSearchError('');
    api
      .get('users/search/', { params: { q: query } })
      .then((response) => {
        if (cancelled) return;
        setUserSearchResults(response.data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setUserSearchError(err.response?.data?.error || 'Failed to search users.');
        setUserSearchResults([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsUserSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedUserSearchInput]);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleEdit = () => {
    setProfileSaveError('');
    setFormData(user);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const normalizedUsername = (formData.username || '')
      .trim()
      .replace(/^@+/, '')
      .replace(/\s+/g, '');

    if (!normalizedUsername) {
      setProfileSaveError('Username is required.');
      return;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setProfileSaveError("Username can only include letters, numbers, '-' and '_'.");
      return;
    }

    try {
      setProfileSaveError('');

      if (
        normalizedUsername.toLowerCase() !== (user.username || '').toLowerCase()
      ) {
        const availabilityRes = await api.get('users/username-available/', {
          params: { username: normalizedUsername },
          cache: false,
        });
        if (!availabilityRes.data?.available) {
          setProfileSaveError('Username is already taken.');
          return;
        }
      }

      await api.patch('auth/profile/', {
        full_name: formData.name,
        username: normalizedUsername,
        user_role: formData.role,
        org_name: formData.organization,
        org_loc: formData.location
      });
      setUser(prev => ({
        ...prev,
        name: formData.name,
        username: normalizedUsername,
        role: formData.role,
        organization: formData.organization,
        location: formData.location
      }));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile", err);
      const payload = err.response?.data || {};
      setProfileSaveError(
        payload.username?.[0] ||
          payload.detail ||
          "Failed to save changes."
      );
    }
  };

  const handleCancel = () => {
    setProfileSaveError('');
    setFormData(user);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username') {
      const cleaned = value.replace(/^@+/, '').replace(/\s+/g, '');
      setFormData({ ...formData, username: cleaned });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const toggleWorkspaceStar = async (workspaceId, nextState) => {
    if (!workspaceId || starringWorkspaceIds.includes(workspaceId)) return;

    const previousState = !!workspaces.find((workspace) => workspace.id === workspaceId)?.is_starred;
    setStarringWorkspaceIds((prev) => [...prev, workspaceId]);
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, is_starred: nextState } : workspace
      )
    );

    try {
      const response = await api.patch(`workspaces/${workspaceId}/star/`, { is_starred: nextState });
      const confirmedState = typeof response?.data?.is_starred === 'boolean'
        ? response.data.is_starred
        : nextState;
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, is_starred: confirmedState }
            : workspace
        )
      );
    } catch (error) {
      console.error('Failed to update starred state', error);
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, is_starred: previousState }
            : workspace
        )
      );
    } finally {
      setStarringWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));
    }
  };

  const sortedWorkspaces = [...workspaces].sort((left, right) => {
    if (left.is_starred !== right.is_starred) {
      return Number(right.is_starred) - Number(left.is_starred);
    }
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
  const filteredWorkspaces = sortedWorkspaces.filter((workspace) => {
    const q = workspaceSearchInput.trim().toLowerCase();
    if (!q) return true;
    return (
      (workspace.name || '').toLowerCase().includes(q) ||
      (workspace.description || '').toLowerCase().includes(q) ||
      (workspace.visibility || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingState message="Loading profile" minHeight="100vh" />;
  if (!user) return <div className="h-screen flex items-center justify-center text-red-600">Failed to load profile.</div>;

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
      
      <div className="flex-none z-50">
        <AuthenticatedNavbar />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        
        {/* LEFT SIDEBAR (Unchanged UI) */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0 relative group/sidebar md:overflow-y-auto">
          {!isEditing && (
            <button 
              onClick={handleEdit}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100"
              title="Edit Profile"
            >
              <Edit2 size={16} />
            </button>
          )}

          <div className="p-6 md:p-8 flex flex-col items-center text-center border-b border-gray-100">
            <div className="relative group cursor-pointer mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                {user.avatar ? (
                   <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                   <User size={40} className="text-gray-400" />
                )}
              </div>
              <div className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <Camera size={24} className="text-white" />
              </div>
            </div>
            
            {isEditing ? (
              <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-center font-semibold text-gray-900 border-b border-blue-500 focus:outline-none bg-blue-50/10"
                />
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Role"
                  className="w-full px-3 py-2 text-center text-sm font-medium text-gray-500 border-b border-blue-500 focus:outline-none bg-blue-50/10"
                />
                <div className="relative">
                  <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username || ''}
                    onChange={handleChange}
                    placeholder="username"
                    className="w-full px-3 py-2 pl-8 text-center text-sm font-semibold text-blue-700 border-b border-blue-500 focus:outline-none bg-blue-50/10"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full space-y-1 p-2 rounded-xl transition-colors">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 tracking-tight md:max-w-[220px] md:truncate">
                    {user.name}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 font-medium md:max-w-[220px] md:mx-auto md:truncate">
                  {user.role}
                </p>
                {!!user.username && (
                  <p className="text-sm font-semibold text-blue-700 md:max-w-[220px] md:mx-auto md:truncate">
                    @{user.username}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2 rounded-lg">
                <Building size={16} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    placeholder="Organization"
                    className="flex-1 px-2 py-1 border-b border-blue-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <span className="flex-1 md:max-w-[180px] md:truncate" title={user.organization}>
                    {user.organization}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2 rounded-lg">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Location"
                    className="flex-1 px-2 py-1 border-b border-blue-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <span className="flex-1 md:max-w-[180px] md:truncate" title={user.location}>
                    {user.location}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                <span 
                  onClick={!isEditing ? handleCopyEmail : undefined}
                  className={`flex-1 md:max-w-[170px] md:truncate ${!isEditing ? 'cursor-pointer hover:text-blue-600 transition-colors' : 'text-gray-400 cursor-not-allowed'}`}
                  title={user.email}
                >
                  {user.email}
                </span>
                {isEditing ? (
                  <Lock size={12} className="text-gray-300 flex-shrink-0" />
                ) : (
                  <button onClick={handleCopyEmail} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {emailCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <span className={isEditing ? "text-gray-400" : ""}>Joined {user.joined}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-white mt-auto">
            {isEditing ? (
              <div className="flex gap-2 animate-in slide-in-from-bottom-2 duration-200">
                <button 
                  onClick={handleSave}
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-black transition-colors"
                >
                  <Check size={16} /> Save
                </button>
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2.5 flex items-center justify-center gap-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEdit}
                className="w-full py-2.5 flex items-center justify-center gap-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
              >
                <Settings size={16} className="group-hover:rotate-45 transition-transform" />
                Edit Profile
              </button>
            )}
            {isEditing && profileSaveError && (
              <p className="mt-3 text-xs font-medium text-red-600">{profileSaveError}</p>
            )}
          </div>
        </aside>

        {/* RIGHT CONTENT (workspaces + right sidebar search) */}
        <main className="flex-1 md:overflow-y-auto bg-gray-50 p-4 sm:p-8 md:p-10">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Workspaces</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={workspaceSearchInput}
                      onChange={(event) => setWorkspaceSearchInput(event.target.value)}
                      placeholder="Search workspaces..."
                      className="h-9 w-52 rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-md border border-gray-200 w-fit">
                    {filteredWorkspaces.length} Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredWorkspaces.map((workspace) => (
                  <div 
                    key={workspace.id}
                    onClick={() => navigate(`/app/ws/${workspace.id}`)}
                    className="group bg-white border border-gray-200 rounded-xl p-5 md:p-6 hover:border-blue-300 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Building size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {workspace.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Updated {formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {workspace.visibility === 'public' ? (
                        <span className="flex items-center justify-center gap-1.5 w-24 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold uppercase tracking-wide rounded-md">
                          <Globe size={12} /> Public
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5 w-24 py-1 bg-gray-900 text-white border border-gray-800 text-[10px] font-semibold uppercase tracking-wide rounded-md">
                          <Lock size={12} /> Private
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                      {workspace.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                        <span>{workspace.owner_name === user.id ? 'Owner' : 'Member'}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>{workspace.member_count} members</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleWorkspaceStar(workspace.id, !workspace.is_starred);
                          }}
                          aria-label={workspace.is_starred ? 'Unstar workspace' : 'Star workspace'}
                          title={workspace.is_starred ? 'Unstar workspace' : 'Star workspace'}
                          disabled={starringWorkspaceIds.includes(workspace.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Star size={16} className={workspace.is_starred ? 'fill-amber-400 text-amber-500' : ''} />
                        </button>
                        <div className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                          <ArrowRight size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredWorkspaces.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
                    No workspaces found.
                  </div>
                )}
              </div>
            </section>

            <aside className="xl:sticky xl:self-start">
              <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">User Search</h2>
                    <p className="text-sm text-gray-500">Seeking someone? Type away.</p>
                  </div>
                </div>

                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={userSearchInput}
                    onChange={(event) => setUserSearchInput(event.target.value)}
                    placeholder="Search by username.."
                    className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-3">
                  {!debouncedUserSearchInput ? (
                    <p className="text-sm text-gray-500">Type to search users</p>
                  ) : isUserSearchLoading ? (
                    <p className="text-sm text-gray-500">Searching users...</p>
                  ) : userSearchError ? (
                    <p className="text-sm text-red-600">{userSearchError}</p>
                  ) : userSearchResults.length === 0 ? (
                    <p className="text-sm text-gray-500">No users found.</p>
                  ) : (
                    <div className="grid gap-2">
                      {userSearchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => navigate(`/app/users/${encodeURIComponent(result.username)}`)}
                          className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <p className="text-sm font-semibold text-gray-900">{result.full_name || "Unnamed user"}</p>
                          <p className="text-xs font-medium text-blue-700">@{result.username}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
