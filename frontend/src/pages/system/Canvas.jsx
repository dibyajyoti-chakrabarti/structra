import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Search, 
  Type, 
  Square, 
  Circle, 
  MessageSquare, 
  Minus, 
  Edit3, 
  Undo, 
  Redo, 
  Play,
  FileDown,
  ChevronRight,
  X,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import api from '../../api';

// Mobile Restriction Modal
const MobileRestrictionModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Smartphone size={24} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Desktop Required</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              The Canvas editor requires a <span className="font-bold">tablet or desktop</span> screen for the best experience. Please switch to a larger device to access this feature.
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Minimum screen width: 768px (tablet)
          </p>

          <button 
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// Breadcrumb Component
const Breadcrumb = ({ userName, workspaceName, systemName, workspaceId }) => {
  const navigate = useNavigate();

  const truncate = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => navigate('/app/profile')}
        className="text-blue-600 hover:text-blue-700 font-medium hover:underline max-w-[120px] truncate"
        title={userName}
      >
        {truncate(userName, 15)}
      </button>
      
      <ChevronRight size={16} className="text-gray-400" />
      
      <button
        onClick={() => navigate(`/app/ws/${workspaceId}`)}
        className="text-blue-600 hover:text-blue-700 font-medium hover:underline max-w-[150px] truncate"
        title={workspaceName}
      >
        {truncate(workspaceName, 20)}
      </button>
      
      <ChevronRight size={16} className="text-gray-400" />
      
      <span className="text-gray-700 font-semibold max-w-[200px] truncate" title={systemName}>
        {truncate(systemName, 25)}
      </span>
    </div>
  );
};

// Tool Button Component
const ToolButton = ({ icon: Icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' 
          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
};

const Canvas = () => {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  
  // State
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTool, setActiveTool] = useState('search');
  const [showMobileModal, setShowMobileModal] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setShowMobileModal(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [systemRes, workspaceRes, userRes] = await Promise.all([
          api.get(`workspaces/${workspaceId}/canvases/${systemId}/`),
          api.get(`workspaces/${workspaceId}/`),
          api.get('auth/profile/')
        ]);

        setSystem(systemRes.data);
        setWorkspace(workspaceRes.data);
        setUser(userRes.data);
      } catch (error) {
        console.error("Failed to fetch canvas data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, systemId]);

  const handleEvaluate = () => {
    navigate(`/app/ws/${workspaceId}/systems/${systemId}/evaluate`);
  };

  const handlePresent = () => {
    navigate(`/app/ws/${workspaceId}/systems/${systemId}/present`);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked');
  };

  if (showMobileModal) {
    return <MobileRestrictionModal onClose={() => navigate(`/app/ws/${workspaceId}`)} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400 font-medium">Loading canvas...</div>
      </div>
    );
  }

  if (!system || !workspace || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-red-500 font-medium">Failed to load canvas</div>
      </div>
    );
  }

  const tools = [
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'concepts', icon: Type, label: 'Cpts' },
    { id: 'text', icon: Type, label: 'Txt' },
    { id: 'forms', icon: Square, label: 'Frms' },
    { id: 'comment', icon: MessageSquare, label: 'Cmt' },
    { id: 'pen', icon: Edit3, label: 'Pen' },
    { id: 'undo', icon: Undo, label: 'Undo' },
    { id: 'redo', icon: Redo, label: 'Redo' },
  ];

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Breadcrumb */}
          <Breadcrumb 
            userName={user.full_name}
            workspaceName={workspace.name}
            systemName={system.name}
            workspaceId={workspaceId}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleEvaluate}
              className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
            >
              Evaluate
            </button>
            <button
              onClick={handlePresent}
              className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
            >
              Present
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
            >
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-24 border-r border-gray-200 bg-white flex flex-col py-6 px-3 space-y-2">
          {tools.map((tool) => (
            <ToolButton
              key={tool.id}
              icon={tool.icon}
              label={tool.label}
              active={activeTool === tool.id}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-gray-50 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Canvas content will go here */}
            <div className="text-center text-gray-400">
              <p className="text-lg font-medium mb-2">Canvas Editor</p>
              <p className="text-sm">System: {system.name}</p>
            </div>
          </div>

          {/* Currently Active Indicator */}
          <div className="absolute bottom-8 right-8">
            <button className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-lg hover:border-green-400 transition-all">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold text-gray-700 text-sm">Currently Active</span>
              <Play size={16} className="text-gray-600" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Canvas;