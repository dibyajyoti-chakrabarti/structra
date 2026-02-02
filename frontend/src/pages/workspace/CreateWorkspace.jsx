import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, UserPlus, X, ChevronRight, Globe, Lock } from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const [inviteEmail, setInviteEmail] = useState('');
  
  // State for member list
  const [members, setMembers] = useState([
    'You (Owner)',
  ]);
  
  const [visibility, setVisibility] = useState('private');

  const handleFinish = () => {
    // In a real app, you'd POST data here.
    // For now, redirect to the new workspace (simulated ID 99)
    navigate('/app/ws/99');
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    // Simulate searching/adding a random mock email
    const randomSuffix = Math.floor(Math.random() * 10000);
    const mockEmail = inviteEmail || `user.${randomSuffix}@structra.cloud`;
    
    if (!members.includes(mockEmail)) {
      setMembers([...members, mockEmail]);
    }
    setInviteEmail('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AuthenticatedNavbar />

      {/* Main Content Wrapper - Centered with Padding like WorkspaceHome */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        
        {/* White Card Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
          
          {/* LEFT SECTION: Main Form */}
          <div className="w-full lg:flex-[2] flex flex-col p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-100">
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Create New Workspace</h1>
              <p className="text-gray-500 mt-2">Establish a secure environment for your team and projects.</p>
            </div>

            <form className="space-y-8 flex-1">
              
              {/* Workspace Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">Workspace Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Acme Corp Engineering"
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-lg font-medium"
                />
              </div>

              {/* Visibility Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">Visibility Level</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      visibility === 'private' 
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${visibility === 'private' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Lock size={18} />
                      </div>
                      <span className={`font-bold ${visibility === 'private' ? 'text-blue-900' : 'text-gray-900'}`}>Private</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Only invited members can access.</p>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      visibility === 'public' 
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                     <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${visibility === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Globe size={18} />
                      </div>
                      <span className={`font-bold ${visibility === 'public' ? 'text-blue-900' : 'text-gray-900'}`}>Public</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Visible to the entire organization.</p>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">Description</label>
                <textarea 
                  rows="3"
                  placeholder="What is this workspace for?"
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none"
                ></textarea>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="pt-8 flex justify-end gap-4 mt-auto">
              <button 
                onClick={() => navigate('/app/home')}
                className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinish}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
              >
                <Save size={20} />
                Create Workspace
              </button>
            </div>
          </div>

          {/* RIGHT SECTION: Initial Team Invite */}
          <div className="w-full lg:flex-1 flex flex-col bg-gray-50/50">
            <div className="p-8 lg:p-12 pb-4">
              <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" /> 
                Invite Members
              </h3>
              <p className="text-sm text-gray-500 mt-1">Add your core team members.</p>
            </div>

            {/* Add Input */}
            <div className="px-8 lg:px-12 mb-6">
              <form onSubmit={handleAddMember} className="relative group">
                <input 
                  type="text" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Search to add random user..."
                  className="w-full pl-4 pr-12 py-3 bg-white rounded-xl border border-gray-200 group-focus-within:border-blue-500 outline-none transition-all shadow-sm"
                />
                <button type="submit" className="absolute right-2 top-1.5 p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors">
                  <ChevronRight size={18} />
                </button>
              </form>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto px-8 lg:px-12 pb-8 space-y-3 custom-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 mb-2">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Added ({members.length})</span>
              </div>
              
              {members.map((user, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {user[0].toUpperCase()}
                     </div>
                     <span className="text-sm font-semibold text-gray-700 truncate">{user}</span>
                  </div>
                  {i !== 0 && <X size={16} className="text-gray-300 hover:text-red-500 cursor-pointer" />}
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