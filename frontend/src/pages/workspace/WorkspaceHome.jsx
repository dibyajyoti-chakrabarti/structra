import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import WorkspaceNavbar from '../../components/WorkspaceNavbar';
import { Info, Lock, Globe } from 'lucide-react';

export default function WorkspaceHome() {
  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans overflow-hidden">
      
      {/* Top Account Navbar */}
      <div className="flex-none">
        <AuthenticatedNavbar />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <WorkspaceNavbar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-3xl mx-auto py-8 px-6">
            
            {/* Header - Reduced margin */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                Create a new workspace
              </h1>
              <p className="text-gray-500 text-sm">
                Set up a collaborative environment for your system architecture.
              </p>
            </div>

            {/* White Form Card - Compact padding */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col gap-5">
                
                {/* Workspace Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Core Engineering"
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                
                {/* Visibility Selection - Compact Cards */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Visibility Level
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        
                        {/* Option 1: Private */}
                        <label className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col gap-2 group">
                            <div className="flex items-center justify-between">
                                <Lock size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                                <input type="radio" name="visibility" className="accent-blue-600" defaultChecked />
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Private</span>
                                <span className="text-xs text-gray-500">Only invited members</span>
                            </div>
                        </label>

                        {/* Option 2: Public */}
                        <label className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col gap-2 group">
                            <div className="flex items-center justify-between">
                                <Globe size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                                <input type="radio" name="visibility" className="accent-blue-600" />
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Public</span>
                                <span className="text-xs text-gray-500">Anyone with the link</span>
                            </div>
                        </label>

                    </div>
                </div>

                {/* Description - Reduced height */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Description 
                    <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the purpose of this workspace..."
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>

                {/* Footer / CTA - Tighter spacing */}
                <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                    <Info size={14} />
                    <span>Admins can change settings later.</span>
                  </div>
                  
                  {/* Primary Button */}
                  <button
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Create Workspace
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}