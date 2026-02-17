import React, { useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Search, Download, AlertCircle, CheckCircle, Clock, Filter, FileText, Activity } from 'lucide-react';

const LogSettings = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { isAdmin } = useOutletContext();
  const [filter, setFilter] = useState('all');

  // Mock Log Data
  const logs = [
    { id: 1, action: 'System Created', target: 'Supply Chain Model', user: 'Alex Rivera', time: '10:42 AM', date: 'Today', status: 'success' },
    { id: 2, action: 'Permission Updated', target: 'Financial Pipeline', user: 'Jordan Smyth', time: '09:15 AM', date: 'Today', status: 'success' },
    { id: 3, action: 'Failed Login Attempt', target: 'N/A', user: 'Unknown IP', time: '02:30 AM', date: 'Today', status: 'error' },
    { id: 4, action: 'Workspace Renamed', target: 'Structra Engineering', user: 'Alex Rivera', time: '4:50 PM', date: 'Yesterday', status: 'success' },
    { id: 5, action: 'Member Removed', target: 'Sam Chen', user: 'Alex Rivera', time: '11:20 AM', date: 'Yesterday', status: 'warning' },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'error': return <AlertCircle size={16} className="text-red-600" />;
      case 'warning': return <Clock size={16} className="text-orange-600" />;
      default: return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-100';
      case 'error': return 'bg-red-50 border-red-100';
      case 'warning': return 'bg-orange-50 border-orange-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Access Restricted</h2>
          <p className="text-sm text-red-700 mb-4">Action allowed only for admin.</p>
          <button
            type="button"
            onClick={() => navigate(`/app/ws/${workspaceId}/settings`)}
            className="px-4 py-2 rounded-md bg-white border border-red-300 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Audit Logs
          </h2>
          <p className="text-gray-500 mt-1.5 text-sm">
            Track all activities and system changes within this workspace.
          </p>
        </div>
        <button className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
         <div className="bg-white p-5 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Events (30d)</p>
            <p className="text-2xl font-semibold text-gray-900">2,845</p>
         </div>
         <div className="bg-white p-5 rounded-xl border border-red-200">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Failed Actions</p>
            <p className="text-2xl font-semibold text-red-700">12</p>
         </div>
         <div className="bg-white p-5 rounded-xl border border-blue-200">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Active Users</p>
            <p className="text-2xl font-semibold text-blue-700">8</p>
         </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by user, action, or resource..." 
            className="w-full pl-11 pr-4 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm"
          />
        </div>
        <div className="relative min-w-[180px]">
           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <select 
             className="w-full pl-11 pr-4 py-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium text-gray-600 appearance-none bg-white cursor-pointer text-sm"
             value={filter}
             onChange={(e) => setFilter(e.target.value)}
           >
             <option value="all">All Events</option>
             <option value="security">Security</option>
             <option value="system">System</option>
             <option value="user">User Actions</option>
           </select>
        </div>
      </div>

      {/* Logs List Container */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Table Header (Hidden on small screens) */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
           <div className="col-span-4">Activity</div>
           <div className="col-span-3">User</div>
           <div className="col-span-3">Date</div>
           <div className="col-span-2 text-right">Status</div>
        </div>

        {/* List Items */}
        <div className="overflow-y-auto custom-scrollbar">
           {logs.map((log) => (
             <div key={log.id} className="p-4 border-b border-gray-50 hover:bg-blue-50/30 transition-colors grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center group">
                
                {/* Activity Column */}
                <div className="col-span-4 flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${log.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                      <FileText size={18} />
                   </div>
                   <div>
                      <p className="font-bold text-gray-900 text-sm">{log.action}</p>
                      <p className="text-xs text-gray-500 font-medium">Target: {log.target}</p>
                   </div>
                </div>

                {/* User Column */}
                <div className="col-span-3 flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                      {log.user[0]}
                   </div>
                   <span className="text-sm font-medium text-gray-700">{log.user}</span>
                </div>

                {/* Date Column */}
                <div className="col-span-3 text-sm text-gray-500 font-medium flex flex-col">
                   <span>{log.date}</span>
                   <span className="text-xs text-gray-400">{log.time}</span>
                </div>

                {/* Status Column */}
                <div className="col-span-2 flex justify-end">
                   <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${getStatusBg(log.status)}`}>
                      {getStatusIcon(log.status)}
                      <span className={`text-xs font-bold capitalize ${
                          log.status === 'success' ? 'text-green-700' : 
                          log.status === 'error' ? 'text-red-700' : 'text-orange-700'
                      }`}>
                          {log.status}
                      </span>
                   </div>
                </div>
             </div>
           ))}
        </div>
        
        {/* Pagination / Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
            <button className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                Load More Events
            </button>
        </div>
      </div>
    </div>
  );
};

export default LogSettings;
