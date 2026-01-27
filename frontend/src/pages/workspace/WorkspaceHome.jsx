import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import WorkspaceNavbar from '../../components/WorkspaceNavbar';
import { ChevronDown, Info, Globe, Lock, Building2 } from 'lucide-react';

export default function WorkspaceHome() {
  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans">
      
      {/* Top Account Navbar */}
      <AuthenticatedNavbar />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <WorkspaceNavbar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-3xl mx-auto py-12 px-8">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                Create a new workspace
              </h1>
              <p className="text-gray-500 text-lg">
                Set up a collaborative environment for your system architecture.
              </p>
            </div>

            {/* White Form Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="grid grid-cols-1 gap-8">
                
                {/* Workspace Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Core Engineering"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                
                {/* Visibility Selection with Icons */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Visibility Level
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Option 1: Private */}
                        <label className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col gap-3 group">
                            <div className="flex items-center justify-between">
                                <Lock size={20} className="text-gray-400 group-hover:text-blue-600" />
                                <input type="radio" name="visibility" className="accent-blue-600" defaultChecked />
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Private</span>
                                <span className="text-xs text-gray-500">Only invited members</span>
                            </div>
                        </label>

                        {/* Option 2: Organization */}
                        <label className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col gap-3 group">
                            <div className="flex items-center justify-between">
                                <Building2 size={20} className="text-gray-400 group-hover:text-blue-600" />
                                <input type="radio" name="visibility" className="accent-blue-600" />
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Organization</span>
                                <span className="text-xs text-gray-500">Everyone in structra</span>
                            </div>
                        </label>

                        {/* Option 3: Public */}
                        <label className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col gap-3 group">
                            <div className="flex items-center justify-between">
                                <Globe size={20} className="text-gray-400 group-hover:text-blue-600" />
                                <input type="radio" name="visibility" className="accent-blue-600" />
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Public</span>
                                <span className="text-xs text-gray-500">Anyone with the link</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Description 
                    <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the purpose of this workspace..."
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>

                {/* Footer / CTA */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                    <Info size={14} />
                    <span>Admins can change settings later.</span>
                  </div>
                  
                  {/* Primary Button */}
                  <button
                    className="px-8 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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