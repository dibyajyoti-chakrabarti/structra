import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Search, 
  Database,
  Server,
  Cloud,
  Globe,
  Lock,
  Zap,
  MessageSquare,
  GitBranch,
  Layers,
  Box,
  FileJson,
  Edit3,
  Undo,
  Redo,
  Play,
  FileDown,
  ChevronRight,
  X,
  AlertCircle,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Move,
  MousePointer2,
  Hand,
  Users,
  Share2,
  Save,
  RefreshCw,
  ChevronDown,
  Sparkles,
  Plus
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
const ToolButton = ({ icon: Icon, label, active, onClick, color = 'blue', badge }) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-semibold transition-all ${
        active 
          ? `bg-gradient-to-br from-${color}-50 to-${color}-100 text-${color}-700 shadow-md border-2 border-${color}-300 scale-105` 
          : 'text-gray-600 hover:bg-gray-50 hover:scale-105 border-2 border-transparent hover:shadow-sm'
      }`}
      title={label}
    >
      <Icon size={20} className={active ? `text-${color}-600` : 'text-gray-500 group-hover:text-gray-700'} />
      <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
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
  const [activeTool, setActiveTool] = useState('select');
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [activeComponent, setActiveComponent] = useState(null);

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
    { id: 'select', icon: MousePointer2, label: 'Select', color: 'blue' },
    { id: 'pan', icon: Hand, label: 'Pan', color: 'purple' },
    { id: 'comment', icon: MessageSquare, label: 'Comment', color: 'yellow', badge: '3' },
  ];

  const components = [
    { id: 'database', icon: Database, label: 'Database', color: 'green' },
    { id: 'server', icon: Server, label: 'Server', color: 'blue' },
    { id: 'cloud', icon: Cloud, label: 'Cloud', color: 'sky' },
    { id: 'api', icon: Globe, label: 'API', color: 'purple' },
    { id: 'auth', icon: Lock, label: 'Auth', color: 'red' },
    { id: 'queue', icon: Layers, label: 'Queue', color: 'orange' },
    { id: 'cache', icon: Zap, label: 'Cache', color: 'yellow' },
    { id: 'service', icon: Box, label: 'Service', color: 'indigo' },
    { id: 'flow', icon: GitBranch, label: 'Flow', color: 'pink' },
    { id: 'data', icon: FileJson, label: 'Data', color: 'teal' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="px-6 py-3.5 flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-4">
            <Breadcrumb 
              userName={user.full_name}
              workspaceName={workspace.name}
              systemName={system.name}
              workspaceId={workspaceId}
            />
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-sm">
            <button
              onClick={() => setZoom(Math.max(25, zoom - 10))}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} className="text-gray-600" />
            </button>
            <span className="text-xs font-bold text-gray-700 min-w-[45px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} className="text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg transition-colors ${
                showGrid ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle Grid"
            >
              <Grid3x3 size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Collaborators">
              <Users size={18} className="text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Share">
              <Share2 size={18} className="text-gray-600" />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button
              onClick={handleEvaluate}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all text-sm shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Sparkles size={16} />
              Evaluate
            </button>
            <button
              onClick={handlePresent}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all text-sm shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Play size={16} />
              Present
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all text-sm flex items-center gap-2"
            >
              <FileDown size={16} />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-[88px] border-r border-gray-200 bg-white/90 backdrop-blur-sm flex flex-col shadow-lg">
          {/* Tools Section */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Tools
            </h3>
            <div className="space-y-1.5">
              {tools.map((tool) => (
                <ToolButton
                  key={tool.id}
                  icon={tool.icon}
                  label={tool.label}
                  color={tool.color}
                  badge={tool.badge}
                  active={activeTool === tool.id}
                  onClick={() => setActiveTool(tool.id)}
                />
              ))}
            </div>
          </div>

          {/* Components Section */}
          <div className="flex-1 p-3 overflow-y-auto">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Components
            </h3>
            <div className="space-y-1.5">
              {components.map((comp) => (
                <ToolButton
                  key={comp.id}
                  icon={comp.icon}
                  label={comp.label}
                  color={comp.color}
                  active={activeComponent === comp.id}
                  onClick={() => setActiveComponent(comp.id)}
                />
              ))}
            </div>
          </div>

          {/* History Controls */}
          <div className="p-3 border-t border-gray-100 space-y-1.5">
            <button className="w-full p-2.5 rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center" title="Undo">
              <Undo size={18} className="text-gray-600" />
            </button>
            <button className="w-full p-2.5 rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center" title="Redo">
              <Redo size={18} className="text-gray-600" />
            </button>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden">
          {/* Grid Background */}
          {showGrid && (
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Canvas Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Welcome State */}
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-6">
                <Box size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Start Designing
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Drag and drop system components from the left panel to create your architecture diagram
              </p>
              <div className="flex items-center justify-center gap-3">
                <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <Plus size={18} />
                  Add Component
                </button>
                <button className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2">
                  <Search size={18} />
                  Templates
                </button>
              </div>
            </div>
          </div>

          {/* Mini Toolbar - Floating */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Save">
              <Save size={16} className="text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
              <RefreshCw size={16} className="text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button className="px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              Layers
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Properties Panel - Floating Right */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 w-64">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              Properties
            </h3>
            <div className="space-y-3 text-xs text-gray-500">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                Select a component to view properties
              </div>
            </div>
          </div>

          {/* Status Bar - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-4 py-2 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">
                <span className="font-semibold text-gray-700">System:</span> {system.name}
              </span>
              <div className="w-px h-4 bg-gray-300"></div>
              <span className="text-gray-500">
                <span className="font-semibold text-gray-700">Components:</span> 0
              </span>
              <div className="w-px h-4 bg-gray-300"></div>
              <span className="text-gray-500">
                <span className="font-semibold text-gray-700">Connections:</span> 0
              </span>
            </div>

            {/* Currently Active Indicator */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-300"></div>
              <span className="font-bold text-green-700 text-xs flex items-center gap-1.5">
                Live
                <Play size={12} />
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <Users size={14} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">3 online</span>
              </div>
              <span className="text-xs text-gray-400">Auto-saved 2m ago</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Canvas;