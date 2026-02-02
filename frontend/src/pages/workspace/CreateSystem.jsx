import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, UserPlus, X } from 'lucide-react';

const CreateSystem = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const handleFinish = () => navigate(`/app/ws/${workspaceId}`);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* LEFT SECTION: Main Form */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New System</h1>
          <p className="text-gray-500">Define parameters for your new AI system model.</p>
        </div>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">System Name</label>
            <input 
              type="text" 
              placeholder="e.g. Supply Chain Optimization"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea 
              rows="6"
              placeholder="Briefly describe the purpose of this system..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            ></textarea>
          </div>
        </form>
      </div>

      {/* RIGHT SECTION: Member Management Sidebar */}
      <div className="w-full lg:w-80 border-l border-gray-100 pl-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus size={20} /> Add Members
          </h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="email" 
              placeholder="user@email.com"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none"
            />
            <button className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm">Add</button>
          </div>
          
          {/* Mock Member List */}
          <div className="space-y-2">
            {['You (Owner)', 'colleague@structra.cloud'].map((user, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-gray-600 truncate">{user}</span>
                {i !== 0 && <X size={14} className="text-gray-400 cursor-pointer" />}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 space-y-3">
          <button 
            onClick={handleFinish}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
          >
            <Save size={18} /> Save System
          </button>
          <button 
            onClick={handleFinish}
            className="w-full px-6 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSystem;