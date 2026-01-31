import React, { useState } from 'react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import { User, Mail, MapPin, Calendar, Building, Globe, Lock, ArrowRight, Settings, Check, X, Camera, Edit2 } from 'lucide-react';

export default function Profile() {
  // State for user data
  const [user, setUser] = useState({
    name: "Alex Rivera",
    email: "alex.rivera@structra.cloud",
    role: "Senior System Architect",
    organization: "Structra Inc.",
    location: "San Francisco, CA",
    joined: "September 2025",
    avatar: null
  });

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user);

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

  // Handlers
  const handleEdit = () => {
    setFormData(user);
    setIsEditing(true);
  };

  const handleSave = () => {
    setUser(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans overflow-hidden">
      
      {/* 1. Navbar */}
      <div className="flex-none z-50">
        <AuthenticatedNavbar />
      </div>

      {/* Main Layout: Split Screen on Desktop, Vertical Scroll on Mobile */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        
        {/* 2. Left Sidebar - User Details & Edit Form */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0 relative group/sidebar md:overflow-y-auto">
          
          {/* Edit Trigger (Top Right) */}
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
            
            {/* Avatar */}
            <div className="relative group cursor-pointer mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                <User size={40} className="text-gray-400" />
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
              <div 
                onClick={handleEdit}
                className="w-full space-y-1 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group/header"
              >
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">{user.name}</h2>
                  <Edit2 size={12} className="text-gray-300 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-500 font-medium">{user.role}</p>
              </div>
            )}
          </div>

          {/* Contact / Details */}
          <div className="p-6 space-y-5">
            <div className="space-y-4">
              
              {/* Organization */}
              <div 
                className={`flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2 rounded-lg transition-colors ${!isEditing && 'hover:bg-gray-50 cursor-pointer group/field'}`}
                onClick={!isEditing ? handleEdit : undefined}
              >
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
                  <div className="flex-1 flex items-center justify-between">
                    <span>{user.organization}</span>
                    <Edit2 size={12} className="text-gray-300 opacity-0 group-hover/field:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Location */}
              <div 
                className={`flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2 rounded-lg transition-colors ${!isEditing && 'hover:bg-gray-50 cursor-pointer group/field'}`}
                onClick={!isEditing ? handleEdit : undefined}
              >
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
                  <div className="flex-1 flex items-center justify-between">
                    <span>{user.location}</span>
                    <Edit2 size={12} className="text-gray-300 opacity-0 group-hover/field:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                <span className={`flex-1 break-all ${isEditing ? "text-gray-400 cursor-not-allowed" : ""}`}>
                  {user.email}
                </span>
                {isEditing && <Lock size={12} className="text-gray-300 flex-shrink-0" />}
              </div>

              {/* Joined Date */}
              <div className="flex items-center gap-3 text-sm text-gray-600 p-2 -ml-2">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <span className={isEditing ? "text-gray-400" : ""}>Joined {user.joined}</span>
              </div>

            </div>
          </div>

          {/* Sidebar Footer: Action Buttons */}
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

        {/* 3. Right Content */}
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

                    {/* Tags */}
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