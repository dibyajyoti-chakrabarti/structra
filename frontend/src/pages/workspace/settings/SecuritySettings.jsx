import React, { useState } from 'react';
import { Shield, Globe, Lock, ChevronDown, ChevronUp, Plus, Trash2, Save } from 'lucide-react';

const SecuritySettings = () => {
    // Mock Data for Systems and Users
    const [systems] = useState([
        { 
            id: 1, 
            name: 'Supply Chain Model', 
            users: [
                { id: 1, name: 'Alex Rivera', email: 'alex@structra.cloud', role: 'Viewer' },
                { id: 2, name: 'Sam Chen', email: 'sam@structra.cloud', role: 'Editor' }
            ]
        },
        { 
            id: 2, 
            name: 'Financial Pipeline', 
            users: [] 
        },
        { 
            id: 3, 
            name: 'Cloud Infrastructure', 
            users: [
                { id: 3, name: 'Jordan Smyth', email: 'jordan@structra.cloud', role: 'Admin' }
            ] 
        }
    ]);
    
    const [visibility, setVisibility] = useState('private');
    const [expandedSystem, setExpandedSystem] = useState(1); // Default first system expanded

    const toggleSystem = (id) => {
        if (expandedSystem === id) setExpandedSystem(null);
        else setExpandedSystem(id);
    };

    return (
        <div className="h-full flex flex-col max-w-4xl">
             <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                    Security & Permissions
                </h2>
                <p className="text-gray-500 mt-1.5 text-sm">
                    Configure visibility and granular system access control.
                </p>
            </div>

            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe size={20} className="text-blue-600"/>
                    Workspace Visibility
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                    <div className="flex-1 w-full">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                            Access Level
                        </label>
                        <div className="relative">
                            <select 
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="w-full appearance-none bg-white px-3.5 py-2.5 rounded-md border border-gray-300 font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer text-sm"
                            >
                                <option value="private">Private - Invite only</option>
                                <option value="public">Public - Visible to anyone</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>
                    <button className="w-full md:w-auto bg-gray-900 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2">
                        <Save size={16} />
                        Apply Changes
                    </button>
                </div>
            </div>

            <div className="flex-1 pb-10">
                 <div className="flex justify-between items-end mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Shield size={20} className="text-blue-600"/>
                        IAM (Identity & Access Management)
                    </h3>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
                        + New System Policy
                    </button>
                 </div>

                 <div className="space-y-4">
                    {systems.map(system => (
                        <div key={system.id} className="border border-gray-200 rounded-xl overflow-hidden transition-colors bg-white hover:border-blue-200">
                             <div 
                                onClick={() => toggleSystem(system.id)}
                                className="p-4 flex items-center justify-between cursor-pointer bg-white select-none"
                             >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-md transition-colors ${expandedSystem === system.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        <Lock size={16} />
                                    </div>
                                    <span className={`font-medium text-base ${expandedSystem === system.id ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {system.name}
                                    </span>
                                </div>
                                {expandedSystem === system.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                             </div>

                             {expandedSystem === system.id && (
                                <div className="p-4 border-t border-gray-200 bg-gray-50/70">
                                    <div className="space-y-3 mb-6">
                                        {system.users.length > 0 ? system.users.map(user => (
                                            <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-md border border-gray-200 gap-3 group hover:border-blue-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs border border-blue-100">
                                                        {user.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                        <p className="text-xs text-gray-500 font-medium">
                                                            {user.email} <span className="text-gray-300 px-1">|</span> <span className="text-blue-600">{user.role}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all self-end sm:self-center"
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-6 border border-dashed border-gray-300 rounded-md">
                                                <p className="text-sm text-gray-400 font-medium">No specific access rules defined.</p>
                                                <p className="text-xs text-gray-400 mt-1">This system inherits global workspace permissions.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-4 rounded-md border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                            Grant Access to {system.name}
                                        </h4>
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <input 
                                                type="email" 
                                                placeholder="Enter user email..." 
                                                className="flex-[2] px-3.5 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                                            />
                                            <div className="flex-1 relative min-w-[140px]">
                                                <select className="w-full appearance-none px-3.5 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm bg-white text-gray-600 cursor-pointer">
                                                    <option>Viewer</option>
                                                    <option>Editor</option>
                                                    <option>Commentor</option>
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                            </div>
                                            <button className="bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
