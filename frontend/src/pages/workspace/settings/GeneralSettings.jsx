import React from 'react';
import { Save, Trash2, Globe, Building } from 'lucide-react';

const GeneralSettings = () => {
  return (
    <div className="h-full flex flex-col max-w-3xl">
       {/* Header */}
       <div className="mb-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            General Settings
          </h2>
          <p className="text-gray-500 mt-2 text-sm lg:text-base">
            Manage your workspace's core details and preferences.
          </p>
       </div>

       {/* Form Section */}
       <div className="space-y-6">
          {/* Workspace Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
               <Building size={14} className="text-gray-400" /> 
               Workspace Name
            </label>
            <input
              type="text"
              defaultValue="Structra Engineering" // Placeholder/Mock data
              className="w-full px-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-base font-medium text-gray-900"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
               <Globe size={14} className="text-gray-400" /> 
               Description
            </label>
            <textarea
              rows="4"
              defaultValue="Core engineering workspace for system modeling and evaluations."
              className="w-full px-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none font-medium text-gray-600"
            ></textarea>
          </div>
          
          {/* Save Button */}
          <div className="pt-4 flex justify-end">
             <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
                <Save size={18} />
                Save Changes
             </button>
          </div>
       </div>

       {/* Divider */}
       <div className="my-10 border-t border-gray-100"></div>

       {/* Danger Zone */}
       <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <h3 className="text-red-900 font-bold text-lg mb-2 flex items-center gap-2">
             <Trash2 size={20} />
             Danger Zone
          </h3>
          <p className="text-red-700 text-sm mb-6">
             Deleting this workspace will permanently remove all associated systems, evaluations, and data. This action cannot be undone.
          </p>
          <div className="flex justify-end sm:justify-start">
            <button className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm">
                Delete Workspace
            </button>
          </div>
       </div>
    </div>
  );
};

export default GeneralSettings;