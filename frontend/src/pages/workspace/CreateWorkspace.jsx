import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, UserPlus, X, ChevronRight, Globe, Lock } from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import api from '../../api'; //

const CreateWorkspace = () => {
  const navigate = useNavigate();
  
  // 1. Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private'); // Lowercase matches constant logic in previous step
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2. Member state (currently stays frontend-only based on current backend implementation)
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState(['You (Owner)']);

  // 3. Handle API Submission
  const handleFinish = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Backend expects 'public' or 'private' as defined in core.constants
      const response = await api.post('workspaces/', {
        name: name,
        description: description,
        visibility: visibility.toLowerCase() 
      });

      // Navigate to the dynamic ID returned by the backend (e.g., 8-char alphanumeric)
      navigate(`/app/ws/${response.data.id}`);
    } catch (err) {
      // Handle unique constraint or validation errors
      const errMsg = err.response?.data?.name?.[0] || "Failed to create workspace. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (!members.includes(inviteEmail)) {
      setMembers([...members, inviteEmail]);
    }
    setInviteEmail('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthenticatedNavbar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 bg-gray-50">
        <div className="bg-white overflow-hidden flex flex-col lg:flex-row min-h-[600px] rounded-xl border border-gray-200">
          
          {/* LEFT SECTION: Main Form */}
          <div className="w-full lg:flex-[2] flex flex-col p-6 md:p-12 border-b lg:border-b-0 lg:border-r border-gray-100">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Create New Workspace</h1>
              <p className="text-gray-500 mt-2">Establish a secure environment for your team and projects.</p>
            </div>

            <form onSubmit={handleFinish} className="space-y-8 flex-1">
              {/* Workspace Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Workspace Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp Engineering"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-base"
                />
                {error && <p className="text-red-500 text-xs font-bold uppercase">{error}</p>}
              </div>

              {/* Visibility Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Visibility Level</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-4 rounded-md border text-left transition-colors ${
                      visibility === 'private' 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${visibility === 'private' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Lock size={18} />
                      </div>
                      <span className={`font-medium ${visibility === 'private' ? 'text-blue-900' : 'text-gray-900'}`}>Private</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Only invited members can access.</p>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-4 rounded-md border text-left transition-colors ${
                      visibility === 'public' 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                     <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${visibility === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Globe size={18} />
                      </div>
                      <span className={`font-medium ${visibility === 'public' ? 'text-blue-900' : 'text-gray-900'}`}>Public</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Visible to the entire world.</p>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Description</label>
                <textarea 
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace for?"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
                ></textarea>
              </div>
            </form>

            <div className="pt-8 flex justify-end gap-4 mt-auto">
              <button 
                type="button"
                onClick={() => navigate('/app/home')}
                className="px-6 py-2.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinish}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          {/* RIGHT SECTION: Initial Team Invite */}
          <div className="w-full lg:flex-1 flex flex-col bg-white">
            <div className="p-6 md:p-12 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" /> 
                Invite Members
              </h3>
              <p className="text-sm text-gray-500 mt-1">Add your core team members.</p>
            </div>

            <div className="px-6 md:px-12 mb-6">
              <form onSubmit={handleAddMember} className="relative group">
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email to add..."
                  className="w-full pl-4 pr-12 py-2.5 bg-white rounded-md border border-gray-300 group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 outline-none transition"
                />
                <button type="submit" className="absolute right-2 top-1.5 p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors">
                  <ChevronRight size={18} />
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-8 space-y-3 custom-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Added ({members.length})</span>
              </div>
              
              {members.map((user, i) => (
                <div
                  key={i} 
                  className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 animate-in fade-in slide-in-from-right-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {user[0].toUpperCase()}
                     </div>
                     <span className="text-sm font-semibold text-gray-700 truncate">{user}</span>
                  </div>
                  {i !== 0 && (
                    <X 
                      size={16} 
                      className="text-gray-300 hover:text-red-500 cursor-pointer" 
                      onClick={() => setMembers(members.filter((_, index) => index !== i))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateWorkspace;
