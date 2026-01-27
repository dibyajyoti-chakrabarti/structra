import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Building2, 
  Briefcase, 
  Plus, 
  Globe, 
  Lock, 
  Users,
  Check,
  X,
  Camera
} from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Hardcoded user data
  const [user, setUser] = useState({
    name: 'User Name',
    email: 'email@id.com',
    pronouns: 'he/him',
    bio: 'Strategic systems architect focusing on enterprise AI modeling and decision intelligence.',
    org: 'Organization',
    role: 'Work Position',
  });

  // Hardcoded workspace data
  const workspaces = [
    { id: 'ws-1', name: 'Workspace 1', visibility: 'public', members: 4 },
    { id: 'ws-2', name: 'Workspace 2', visibility: 'private', members: 11 },
    { id: 'ws-3', name: 'Workspace 3', visibility: 'public', members: 2 },
    { id: 'ws-4', name: 'Workspace 4', visibility: 'public', members: 13 },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50/50 text-gray-900 font-sans selection:bg-blue-100">
      <AuthenticatedNavbar />

      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Profile Sidecar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-8">
              {/* Avatar Section */}
              <div className="relative group w-32 h-32 mx-auto mb-8">
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <User size={48} strokeWidth={1.5} />
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-gray-200 rounded-lg shadow-md text-gray-500 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100">
                  <Camera size={16} />
                </button>
              </div>

              {!isEditing ? (
                /* View Mode */
                <div className="space-y-4 text-center">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">{user.name}</h2>
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-1">{user.role}</p>
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed px-2">
                    {user.bio}
                  </p>

                  <div className="pt-6 space-y-3 border-t border-gray-100 text-left">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Mail size={16} className="text-gray-400" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Building2 size={16} className="text-gray-400" />
                      <span>{user.org}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full mt-6 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                /* Edit Mode (GitHub style inline editing) */
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue={user.name} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">Bio</label>
                    <textarea 
                      rows={3}
                      defaultValue={user.bio} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      <X size={16} /> Cancel
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black shadow-md transition-all"
                    >
                      <Check size={16} /> Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Workspaces Section */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Workspaces</h1>
                <p className="text-gray-500 mt-1">Manage your active modeling environments.</p>
              </div>

              <button
                onClick={() => navigate('/app/create-workspace')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
              >
                <Plus size={18} strokeWidth={3} />
                New Workspace
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => navigate(`/app/ws/${ws.id}`)}
                  className="group text-left border border-gray-200 rounded-2xl bg-white p-6 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                      {ws.visibility === 'public' ? (
                        <Globe size={20} className="text-gray-400 group-hover:text-blue-600" />
                      ) : (
                        <Lock size={20} className="text-gray-400 group-hover:text-blue-600" />
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                      ws.visibility === 'public' 
                        ? 'bg-green-50 text-green-600 border-green-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {ws.visibility}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {ws.name}
                  </h3>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <Users size={14} />
                      {ws.members} members
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}