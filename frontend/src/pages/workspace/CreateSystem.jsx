// src/pages/workspace/CreateSystem.jsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';

const CreateSystem = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const handleFinish = () => navigate(`/app/ws/${workspaceId}`);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New System</h1>
        <p className="text-gray-500 mb-8">Define the parameters for your new AI system model.</p>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
              rows="4"
              placeholder="Briefly describe the purpose of this system..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            ></textarea>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              onClick={handleFinish}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleFinish}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
            >
              <Save size={18} />
              Create System
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSystem;