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
    <div className="flex h-[calc(100vh-160px)] gap-0 bg-white">
      {/* LEFT SECTION: System Details Form */}
      <div className="flex-[2] flex flex-col pr-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Create New System
          </h1>
          <p className="text-gray-500 mt-2">
            Configure the core parameters for your system model.
          </p>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
          <form className="space-y-6 flex-1 overflow-y-auto pr-4 custom-scrollbar">
            {/* System Name Section */}
            <div className="flex flex-col space-y-2">
              <label className="text-[0.75rem] md:text-sm font-bold text-gray-800 uppercase tracking-wider">
                System Name
              </label>
              <input
                type="text"
                placeholder="e.g. Neural Link Architecture"
                className="w-full px-4 py-[1.2vh] md:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-base md:text-lg font-medium"
              />
            </div>

            {/* Operational Description Section */}
            <div className="flex flex-col flex-1 space-y-2 min-h-[200px]">
              <label className="text-[0.75rem] md:text-sm font-bold text-gray-800 uppercase tracking-wider">
                Operational Description
              </label>
              <textarea
                placeholder="Detail the system's objective and scope..."
                className="w-full flex-1 px-4 py-[1.2vh] md:py-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none text-sm md:text-base"
              ></textarea>
            </div>
          </form>
        </div>

        {/* Action Buttons: Anchored Bottom Right of this section */}
        <div className="pt-8 flex justify-end gap-4 border-t border-gray-100 mt-4">
          <button
            onClick={handleFinish}
            className="px-8 py-3 rounded-xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
          >
            <Save size={20} />
            Save System
          </button>
        </div>
      </div>

      {/* VERTICAL DIVIDER */}
      <div className="w-px bg-gray-100 h-full"></div>

      {/* RIGHT SECTION: Member Management Sidebar */}
      <div className="flex-1 flex flex-col pl-12">
        <div className="mb-6">
          <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <UserPlus size={22} className="text-blue-600" />
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

        {/* Member List Rectangle: Extends to bottom with Y-Scroll */}
        <div className="flex-1 bg-gray-50 rounded-t-2xl border-x border-t border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Added Members ({members.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {members.map((user, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-2"
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
