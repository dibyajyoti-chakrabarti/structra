import React from 'react';
import { Mail, Trash2 } from 'lucide-react';

const TeamSettings = () => {
  const members = [
    { id: 1, name: 'Yash Thakur', email: 'email@id.com', role: 'Owner' },
    { id: 2, name: 'Collaborator', email: 'dev@structra.cloud', role: 'Editor' },
  ];

  return (
    <div className="max-w-3xl">
      {/* Top Section: Add Members */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Members</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail size={20} />
            </div>
            <input 
              type="email" 
              placeholder="Add an email"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
            />
          </div>
          <button className="bg-black text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm">
            Confirm
          </button>
        </div>
      </div>

      {/* Bottom Section: Team Members List */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Team Members</h2>
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          {members.map((member, index) => (
            <div 
              key={member.id} 
              className={`p-5 flex justify-between items-center ${
                index !== members.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{member.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{member.email}</p>
              </div>
              
              <button 
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                title="Remove Member"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamSettings;