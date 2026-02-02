import React from 'react';
import { Mail, Trash2 } from 'lucide-react';

const TeamSettings = () => {
  const members = [
    { id: 1, name: 'Yash Thakur', email: 'email@id.com', role: 'Owner' },
    { id: 2, name: 'Collaborator', email: 'dev@structra.cloud', role: 'Editor' },
  ];

  return (
    <div className="h-full flex flex-col">
       {/* Header Section - Matches CreateSystem Header */}
       <div className="mb-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            Team Members
          </h2>
          <p className="text-gray-500 mt-2 text-sm lg:text-base">
            Manage access permissions and roles for your workspace.
          </p>
       </div>

       {/* Add Member Section - Matches CreateSystem Input Styling */}
       <div className="mb-10">
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 block">
            Invite New Member
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="Enter email address..."
                  className="w-full pl-11 pr-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-base font-medium"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             </div>
             <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 whitespace-nowrap">
                Send Invite
             </button>
          </div>
       </div>

       {/* List Section - Matches CreateSystem 'Team Access' Panel */}
       <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
               Active Members
             </span>
             <span className="bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold">
               {members.length} Users
             </span>
          </div>

          <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
             {members.map((member) => (
                <div key={member.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center group hover:border-blue-300 transition-all">
                   <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-100">
                         {member.name[0]}
                      </div>
                      <div>
                         <h3 className="font-bold text-gray-900">{member.name}</h3>
                         <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        {member.role}
                      </span>
                      <button 
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