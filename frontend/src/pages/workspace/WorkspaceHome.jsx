import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import WorkspaceNavbar from '../../components/WorkspaceNavbar';

export default function WorkspaceHome() {
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-[#f5f5f5]">
      
      {/* Top Account Navbar */}
      <AuthenticatedNavbar />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Workspace Sidebar */}
        <WorkspaceNavbar />

        {/* Main Content */}
        <div className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold mb-2">
              Open your workspace or...
            </h1>
            <h2 className="text-xl text-[#a3a3a3] mb-8">
              Create a new one
            </h2>

            <div className="border-t border-[#1f1f1f] pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left: Workspace Name */}
              <div>
                <label className="block text-sm text-[#a3a3a3] mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core Engineering"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                />
              </div>

              {/* Right: Visibility */}
              <div>
                <label className="block text-sm text-[#a3a3a3] mb-2">
                  Workspace Visibility
                </label>
                <select
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                >
                  <option>Private</option>
                  <option>Organization</option>
                  <option>Public</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm text-[#a3a3a3] mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the purpose of this workspace"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                />
              </div>

              {/* CTA */}
              <div className="md:col-span-2 flex justify-end">
                <button
                  className="px-6 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
                >
                  Create Workspace
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
