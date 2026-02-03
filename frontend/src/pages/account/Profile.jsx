import React, { useState, useEffect } from 'react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import { User, Mail, MapPin, Calendar, Building, Globe, Lock, ArrowRight, Settings, Check, X, Camera, Edit2, Copy } from 'lucide-react';
import api from '../../api';

export default function Profile() {
  // State for user data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Email Copy State
  const [emailCopied, setEmailCopied] = useState(false);

  // Helper: Format Date
  const formatDate = (isoString) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('profile/'); 
        const userData = {
          name: res.data.full_name,
          email: res.data.email,
          role: res.data.user_role || "Role not set",
          organization: res.data.org_name || "Organization not set",
          location: res.data.org_loc || "Location not set",
          joined: formatDate(res.data.created_at),
          avatar: null
        };
        setUser(userData);
        setFormData(userData);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const workspaces = [
    {
      id: 1,
      name: "Core Engineering",
      role: "Owner",
      visibility: "private",
      members: 12,
      lastActive: "2 hours ago",
      description: "Main architecture workspace for the core platform services and decision engines."
    },
    {
      id: 2,
      name: "Public Documentation",
      role: "Admin",
      visibility: "public",
      members: 840,
      lastActive: "1 day ago",
      description: "Open source system models and architectural patterns for the community."
    },
    {
      id: 3,
      name: "Integration Sandbox",
      role: "Editor",
      visibility: "private",
      members: 5,
      lastActive: "5 days ago",
      description: "Testing environment for third-party API integrations and data flows."
    }
  ];

  const handleEdit = () => {
    setFormData(user);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await api.patch('profile/', {
        full_name: formData.name,
        user_role: formData.role,
        org_name: formData.organization,
        org_loc: formData.location
      });
      setUser(prev => ({
        ...prev,
        name: formData.name,
        role: formData.role,
        organization: formData.organization,
        location: formData.location
      }));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile", err);
      alert("Failed to save changes.");
    }
  };

  const handleCancel = () => {
    setFormData(user);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans overflow-hidden">
      
      <div className="flex-none z-50">
        <AuthenticatedNavbar />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0 relative group/sidebar md:overflow-y-auto">
          
          {!isEditing && (
            <button 
              onClick={handleEdit}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100"
              title="Edit Profile"
            >
              <Edit2 size={16} />
            </button>
          )}

          {/* Profile Header */}
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
                  className="w-full px-3 py-2 text-center font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-blue-50/10"
                />
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Role"
                  className="w-full px-3 py-2 text-center text-sm font-medium text-gray-500 border-b-2 border-blue-500 focus:outline-none bg-blue-50/10"
                />
              </div>
            ) : (
              <div className="w-full space-y-1 p-2 rounded-xl transition-colors">
                <div className="flex items-center justify-center gap-2">
                  {/* LIMIT 1: Name Truncation */}
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight md:max-w-[220px] md:truncate">
                    {user.name}
                  </h2>
                </div>
                {/* LIMIT 2: Role Truncation */}
                <p className="text-sm text-gray-500 font-medium md:max-w-[220px] md:mx-auto md:truncate">
                  {user.role}
                </p>
              </div>
            )}
          </div>

          {/* Contact / Details */}
          <div className="p-6 space-y-5">
            <div className="space-y-4">
              
              {/* ORGANIZATION */}
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
                  // LIMIT 3: Org Truncation + No Interaction
                  <span className="flex-1 md:max-w-[180px] md:truncate" title={user.organization}>
                    {user.organization}
                  </span>
                )}
              </div>

              {/* LOCATION */}
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
                  // LIMIT 4: Location Truncation + No Interaction
                  <span className="flex-1 md:max-w-[180px] md:truncate" title={user.location}>
                    {user.location}
                  </span>
                )}
              </div>

              {/* EMAIL - WITH COPY FUNCTIONALITY */}
              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                
                {/* LIMIT 5: Email Truncation (name@gma...) */}
                <span 
                  onClick={!isEditing ? handleCopyEmail : undefined}
                  className={`flex-1 md:max-w-[170px] md:truncate ${!isEditing ? 'cursor-pointer hover:text-blue-600 transition-colors' : 'text-gray-400 cursor-not-allowed'}`}
                  title={user.email}
                >
                  {user.email}
                </span>

                {/* Icons */}
                {isEditing ? (
                  <Lock size={12} className="text-gray-300 flex-shrink-0" />
                ) : (
                  <button onClick={handleCopyEmail} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {emailCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {/* JOINED DATE */}
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
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
                >
                  <Check size={16} />
                  Save
                </button>
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2.5 flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEdit}
                className="w-full py-2.5 flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
              >
                <Settings size={16} className="group-hover:rotate-45 transition-transform" />
                Edit Profile
              </button>
            )}
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 md:overflow-y-auto bg-gray-50/50 p-4 sm:p-8 md:p-12">
          <div className="max-w-4xl mx-auto md:mx-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workspaces</h1>
              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm w-fit">
                {workspaces.length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {workspaces.map((workspace) => (
                <div 
                  key={workspace.id}
                  className="group bg-white border border-gray-200 rounded-xl p-5 md:p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Building size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {workspace.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Updated {workspace.lastActive}
                        </p>
                      </div>
                    </div>

                    {workspace.visibility === 'public' ? (
                      <span className="flex items-center justify-center gap-1.5 w-24 py-1 bg-blue-50 text-blue-700 border-2 border-blue-700 text-[10px] font-bold uppercase tracking-wide rounded-xl">
                        <Globe size={12} />
                        Public
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5 w-24 py-1 bg-black text-white border border-gray-800 text-[10px] font-bold uppercase tracking-wide rounded-xl">
                        <Lock size={12} />
                        Private
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                    {workspace.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <span>{workspace.role}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span>{workspace.members} members</span>
                    </div>
                    
                    <div className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}