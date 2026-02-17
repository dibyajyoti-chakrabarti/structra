import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../../api';

const TeamSettings = () => {
  const { workspaceId } = useParams();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const response = await api.get(`workspaces/${workspaceId}/members/`);
      setMembers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post(`workspaces/${workspaceId}/invitations/`, {
        email: inviteEmail.trim(),
      });
      setMessage(response.data?.message || 'Invitation sent.');
      setInviteEmail('');
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation.');
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
       <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Team Members
          </h2>
          <p className="text-gray-500 mt-1.5 text-sm">
            Manage access permissions and roles for your workspace.
          </p>
       </div>

       <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
            Invite New Member
          </label>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
             <div className="relative flex-1">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             </div>
             <button
               type="submit"
               disabled={sendingInvite}
               className="bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-60"
             >
                {sendingInvite ? 'Sending...' : 'Send Invite'}
             </button>
          </form>
          {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
       </div>

       <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
               Active Members
             </span>
             <span className="bg-white border border-gray-300 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium">
               {members.length} Users
             </span>
          </div>

          <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
             {loading ? (
               <div className="p-4 text-sm text-gray-400">Loading members...</div>
             ) : members.map((member) => (
                <div key={member.user_id} className="bg-white p-4 rounded-md border border-gray-200 flex justify-between items-center group hover:border-blue-300 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-semibold border border-blue-100">
                         {(member.full_name || member.email || 'U')[0]}
                      </div>
                      <div>
                         <h3 className="font-medium text-gray-900">{member.full_name || member.email}</h3>
                         <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                        {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </span>
                      <button 
                        type="button"
                        disabled
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                        title="Remove Member"
                      >
                         <Trash2 size={18} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

export default TeamSettings;
