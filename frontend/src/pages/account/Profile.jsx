import React, { useState, useEffect } from 'react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import { User, Mail, MapPin, Calendar, Building, Globe, Lock, ArrowRight, Settings, Check, X, Camera, Edit2 } from 'lucide-react';
import api from '../../api';

export default function Profile() {
  // State for user data - initialized as null for loading state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch Profile Data on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // FIXED: Used 'profile/' to match 'login/' from your Login.jsx
        const res = await api.get('profile/'); 
        
        const userData = {
          name: res.data.full_name,
          email: res.data.email,
          role: res.data.user_role || "Role not set",
          organization: res.data.org_name || "Organization not set",
          location: res.data.org_loc || "Location not set",
          joined: "September 2025", 
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
      description: "Testing environment for third-party integrations and API connectors."
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // FIXED: Used 'profile/' here as well
      await api.patch('profile/', {
        full_name: formData.name,
        user_role: formData.role,
        org_name: formData.organization,
        org_loc: formData.location
      });

      setUser(formData);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile", err);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleCancel = () => {
    setFormData(user);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-800 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  // If user data failed to load, show basic fallback or empty state
  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Failed to load profile.</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <AuthenticatedNavbar />

      <div className="pt-24 px-8 max-w-7xl mx-auto flex gap-12">
        
        {/* LEFT SIDEBAR - PROFILE INFO */}
        <aside className="w-80 flex-shrink-0">
          <div className="sticky top-32">
            
            {/* Avatar Section */}
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white">{user.name.charAt(0)}</span>
                  )}
                </div>
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-blue-500">
                <Camera size={16} />
              </button>
            </div>

            {/* User Info / Edit Form */}
            <div className="space-y-6">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xl font-bold text-white focus:outline-none focus:border-blue-600"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                )}
                
                <div className="flex items-center gap-2 mt-2 text-gray-400 text-sm">
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium text-white hover:bg-neutral-800 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleSave}
                      className="flex-1 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-500 transition flex items-center justify-center gap-2"
                    >
                      <Check size={14} />
                      Save
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="flex-1 py-2 bg-neutral-800 rounded-lg text-sm font-medium text-white hover:bg-neutral-700 transition flex items-center justify-center gap-2"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                )}
                <button className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition">
                  <Settings size={18} />
                </button>
              </div>

              {/* Details List */}
              <div className="space-y-4 pt-6 border-t border-neutral-800">
                
                {/* Role */}
                <div className="flex items-center gap-3 text-gray-400">
                  <User size={16} className="text-blue-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="Your Role"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-600"
                    />
                  ) : (
                    <span className="text-sm">{user.role}</span>
                  )}
                </div>

                {/* Organization */}
                <div className="flex items-center gap-3 text-gray-400">
                  <Building size={16} className="text-blue-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleInputChange}
                      placeholder="Organization"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-600"
                    />
                  ) : (
                    <span className="text-sm">{user.organization}</span>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin size={16} className="text-blue-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Location"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-600"
                    />
                  ) : (
                    <span className="text-sm">{user.location}</span>
                  )}
                </div>

                {/* Joined Date (Read Only) */}
                <div className="flex items-center gap-3 text-gray-400">
                  <Calendar size={16} className="text-blue-500" />
                  <span className="text-sm">Joined {user.joined}</span>
                </div>
              </div>

            </div>
          </div>
        </aside>

        {/* MAIN CONTENT - WORKSPACES */}
        <main className="flex-1 pb-20">
          <div className="space-y-8">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Workspaces</h2>
                <p className="text-gray-500 text-sm mt-1">Manage your system modeling environments</p>
              </div>
            </div>

            {/* Workspace Grid */}
            <div className="grid grid-cols-1 gap-4">
              {workspaces.map((workspace) => (
                <div 
                  key={workspace.id}
                  className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-blue-600/30 hover:bg-neutral-900 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-500 transition-colors">
                        {workspace.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Last active {workspace.lastActive}</p>
                    </div>
                    {workspace.visibility === 'public' ? (
                      <span className="flex items-center justify-center gap-1.5 w-24 py-1 bg-blue-500/10 text-blue-700 border-2 border-blue-700 text-[10px] font-bold uppercase tracking-wide rounded-xl">
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

                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <span>{workspace.role}</span>
                      <span className="w-1 h-1 bg-gray-700 rounded-full" />
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