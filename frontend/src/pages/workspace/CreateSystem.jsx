import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, UserPlus, CheckCircle, Search, Circle } from "lucide-react";

const CreateSystem = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");

  // Mock Data: Existing members in the workspace
  const allWorkspaceMembers = [
    { id: 1, name: "Alex Rivera", email: "alex@structra.cloud" },
    { id: 2, name: "Sam Chen", email: "sam@structra.cloud" },
    { id: 3, name: "Jordan Smyth", email: "jordan@structra.cloud" },
    { id: 4, name: "Casey Wu", email: "casey@structra.cloud" },
    { id: 5, name: "Taylor Reed", email: "taylor@structra.cloud" },
    { id: 6, name: "Morgan Lee", email: "morgan@structra.cloud" },
    { id: 7, name: "Jamie Fox", email: "jamie@structra.cloud" },
  ];

  // State: Set of selected User IDs to be added to this system
  // Defaulting to include the first user (Owner simulation)
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set([1]));

  const toggleMember = (id) => {
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMemberIds(newSelected);
  };

  // Filter the list based on search
  const filteredMembers = allWorkspaceMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFinish = () => navigate(`/app/ws/${workspaceId}`);

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-160px)] gap-0 bg-white">
      
      {/* LEFT SECTION: Main Form */}
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

      {/* VERTICAL DIVIDER */}
      <div className="hidden lg:block w-px bg-gray-100 h-full"></div>

      {/* RIGHT SECTION: Member Management Sidebar */}
      <div className="w-full lg:flex-1 flex flex-col pl-0 lg:pl-12 border-t lg:border-t-0 border-gray-100 pt-8 lg:pt-0">
        <div className="mb-6">
          <h3 className="text-lg lg:text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Team Access
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select workspace members to grant access.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative group mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find member..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-transparent group-focus-within:bg-white group-focus-within:border-gray-200 outline-none transition-all"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>

        {/* Member List (Filtered) */}
        <div className="flex-1 bg-gray-50 rounded-t-2xl border-x border-t border-gray-100 flex flex-col overflow-hidden h-64 lg:h-auto">
          <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Workspace Members
            </span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {selectedMemberIds.size} Selected
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {filteredMembers.map((user) => {
              const isSelected = selectedMemberIds.has(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleMember(user.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-blue-50 border-blue-200 shadow-sm" 
                      : "bg-white border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {user.name[0]}
                    </div>
                    <div className="flex flex-col truncate">
                        <span className={`text-sm font-semibold truncate ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                            {user.name}
                        </span>
                        <span className="text-xs text-gray-400 truncate">{user.email}</span>
                    </div>
                  </div>
                  
                  {isSelected ? (
                    <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
                  ) : (
                    <Circle size={20} className="text-gray-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
            
            {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    No members found matching "{searchQuery}"
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSystem;