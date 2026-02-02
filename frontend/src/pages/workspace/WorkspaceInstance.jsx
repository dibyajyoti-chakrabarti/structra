import React, { useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Menu, Settings } from "lucide-react"; // Import Menu icon
import AuthenticatedNavbar from "../../components/AuthenticatedNavbar";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";

const WorkspaceInstance = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <AuthenticatedNavbar />

      {/* Mobile Header for Sidebar Toggle */}
      <div className="md:hidden border-b border-gray-100 p-4 flex items-center gap-3 bg-white">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg"
        >
          <Menu size={24} />
        </button>
        <span className="font-semibold text-gray-900">Workspace Menu</span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar: 
            - Hidden by default on mobile (unless toggled).
            - Always visible on desktop (md:block).
            - We pass the state to WorkspaceNavbar to handle the drawer logic.
        */}
        <WorkspaceNavbar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden bg-white md:border-l border-gray-100 w-full relative z-0">
          <div className="h-full w-full max-w-[1600px] mx-auto p-4 md:p-10 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export const WorkspaceOverview = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  // Hardcoded data
  const stats = [
    { label: "Total Systems", value: "12" },
    { label: "Active Evaluations", value: "5" },
    { label: "Team Members", value: "8" },
  ];

  const systems = [
    { id: 1, name: "Supply Chain Model", status: "Active", updated: "2h ago" },
    { id: 2, name: "Cloud Infrastructure", status: "Draft", updated: "5h ago" },
    { id: 3, name: "Financial Pipeline", status: "Active", updated: "1d ago" },
  ];

  return (
    <div className="pb-10">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Workspace {workspaceId}
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            Overview of your systems and evaluations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}/settings`)}
            className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => navigate(`/app/ws/${workspaceId}/create-system`)}
            className="w-full md:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
          >
            + New System
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm"
          >
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Systems List */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Systems</h2>
      <div className="grid grid-cols-1 gap-3">
        {systems.map((system) => (
          <div
            key={system.id}
            className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center hover:border-blue-400 transition-all cursor-pointer"
          >
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">
                {system.name}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                Last updated {system.updated}
              </p>
            </div>
            <span
              className={`px-2 py-1 md:px-3 md:py-1 rounded-lg text-[10px] md:text-xs font-bold ${system.status === "Active" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}
            >
              {system.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceInstance;
