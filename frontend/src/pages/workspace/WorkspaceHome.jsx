import { useState } from 'react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import WorkspaceNavbar from '../../components/WorkspaceNavbar';
import { Info, Lock, Globe, Menu, X } from 'lucide-react';

export default function WorkspaceHome() {
  // State to control mobile sidebar visibility
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans overflow-hidden">
      
      {/* Top Account Navbar */}
      <div className="flex-none z-50">
        <AuthenticatedNavbar />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Desktop Sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block flex-none h-full overflow-y-auto border-r border-gray-200 bg-white">
            <WorkspaceNavbar />
        </div>

        {/* Mobile Sidebar Drawer (Overlay) */}
        {isSidebarOpen && (
            <div className="absolute inset-0 z-40 md:hidden">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" 
                    onClick={() => setSidebarOpen(false)}
                />
                
                {/* Sidebar Container */}
                <div className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
                    
                    {/* Close Button Area - Minimal, Flush with content */}
                    <div className="flex-none flex justify-end p-2 bg-white">
                        <button 
                            onClick={() => setSidebarOpen(false)} 
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                    
                    {/* Sidebar Content - Starts immediately below X */}
                    <div className="flex-1 overflow-y-auto">
                        <WorkspaceNavbar />
                    </div>
                </div>
            </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
            
            {/* Mobile Toggle Button - Visible only on mobile */}
            <div className="md:hidden px-4 pt-4">
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all w-full sm:w-auto"
                >
                    <Menu size={18} />
                    <span>Open Workspace Menu</span>
                </button>
            </div>

          <div className="max-w-3xl mx-auto py-6 px-4 md:py-8 md:px-6">
            
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                Create a new workspace
              </h1>
              <p className="text-gray-500 text-sm md:text-lg">
                Set up a collaborative environment for your system architecture.
              </p>
            </div>

            {/* White Form Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
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
                
                {/* Visibility Selection */}
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

                {/* Description */}
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

                {/* Footer / CTA */}
                <div className="pt-5 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                    <Info size={14} />
                    <span>Admins can change settings later.</span>
                  </div>
                  
                  {/* Primary Button */}
                  <button
                    className="w-full md:w-auto px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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