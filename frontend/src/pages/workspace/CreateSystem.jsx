import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, UserPlus, X, ChevronRight } from "lucide-react";

const CreateSystem = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  // State for member list to demonstrate scroll
  const [members, setMembers] = useState([
    "You (Owner)",
    "lead.dev@structra.cloud",
    "design@structra.cloud",
    "pm@structra.cloud",
    "qa.engine@structra.cloud",
  ]);

  const handleFinish = () => navigate(`/app/ws/${workspaceId}`);

  return (
    // Responsive container: 
    // - Height is auto on mobile (scrolling page), Fixed calc() on Desktop
    // - Flex column on mobile, Row on Desktop
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-160px)] gap-0 bg-white">
      
      {/* LEFT SECTION: Main Form 
         - Full width on mobile, Flex-[2] on Desktop 
         - Padding adjustments
      */}
      <div className="w-full lg:flex-[2] flex flex-col pr-0 lg:pr-12 mb-8 lg:mb-0">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            Create New System
          </h1>
          <p className="text-gray-500 mt-2 text-sm lg:text-base">
            Configure the core parameters for your system model.
          </p>
        </div>

        <form className="space-y-6 flex-1 overflow-visible lg:overflow-y-auto lg:pr-4 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-xs lg:text-sm font-bold text-gray-800 uppercase tracking-wider">
              System Name
            </label>
            <input
              type="text"
              placeholder="e.g. Neural Link Architecture"
              className="w-full px-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-base lg:text-lg font-medium"
            />
          </div>

          <div className="space-y-2 flex flex-col lg:h-auto">
            <label className="text-xs lg:text-sm font-bold text-gray-800 uppercase tracking-wider">
              Operational Description
            </label>
            <textarea
              rows="6"
              placeholder="Detail the system's objective and scope..."
              className="w-full px-4 py-3 lg:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none lg:flex-1"
            ></textarea>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="pt-6 lg:pt-8 flex justify-end gap-4 border-t border-gray-100 mt-4">
          <button
            onClick={handleFinish}
            className="flex-1 lg:flex-none px-6 lg:px-8 py-3 rounded-xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 lg:flex-none bg-blue-600 text-white px-6 lg:px-10 py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-100 transition-all"
          >
            <Save size={20} />
            <span className="whitespace-nowrap">Save System</span>
          </button>
        </div>
      </div>

      {/* VERTICAL DIVIDER (Hidden on mobile) */}
      <div className="hidden lg:block w-px bg-gray-100 h-full"></div>

      {/* RIGHT SECTION: Member Management Sidebar 
         - Moves to bottom on mobile
         - Full width on mobile, Flex-1 on Desktop
      */}
      <div className="w-full lg:flex-1 flex flex-col pl-0 lg:pl-12 border-t lg:border-t-0 border-gray-100 pt-8 lg:pt-0">
        <div className="mb-6">
          <h3 className="text-lg lg:text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Team Access
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Invite collaborators to this system.
          </p>
        </div>

        {/* Add Input */}
        <div className="relative group mb-6">
          <input
            type="email"
            placeholder="Search by email..."
            className="w-full pl-4 pr-12 py-3 bg-gray-50 rounded-xl border border-transparent group-focus-within:bg-white group-focus-within:border-gray-200 outline-none transition-all"
          />
          <button className="absolute right-2 top-1.5 p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Member List Rectangle */}
        <div className="flex-1 bg-gray-50 rounded-t-2xl border-x border-t border-gray-100 flex flex-col overflow-hidden h-64 lg:h-auto">
          <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Added Members ({members.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {members.map((user, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {user[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 truncate">
                    {user}
                  </span>
                </div>
                {i !== 0 && (
                  <X
                    size={16}
                    className="text-gray-300 hover:text-red-500 cursor-pointer transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSystem;