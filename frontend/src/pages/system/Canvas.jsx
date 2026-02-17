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
  MousePointer2,
  Hand,
  Users,
  Share2,
  Save,
  RefreshCw,
  ChevronDown,
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
const ToolButton = ({ icon: Icon, label, active, onClick, badge }) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'text-gray-600 hover:bg-gray-100 border border-transparent'
      }`}
      title={label}
    >
      <Icon size={16} className={active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'} />
      <span>{label}</span>
      {badge && (
        <span className="ml-auto w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
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
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pan', icon: Hand, label: 'Pan' },
    { id: 'comment', icon: MessageSquare, label: 'Comment', badge: '3' },
  ];

  const components = [
    { id: 'database', icon: Database, label: 'Database' },
    { id: 'server', icon: Server, label: 'Server' },
    { id: 'cloud', icon: Cloud, label: 'Cloud' },
    { id: 'api', icon: Globe, label: 'API' },
    { id: 'auth', icon: Lock, label: 'Auth' },
    { id: 'queue', icon: Layers, label: 'Queue' },
    { id: 'cache', icon: Zap, label: 'Cache' },
    { id: 'service', icon: Box, label: 'Service' },
    { id: 'flow', icon: GitBranch, label: 'Flow' },
    { id: 'data', icon: FileJson, label: 'Data' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-4 min-w-0">
            <Breadcrumb 
              userName={user.full_name}
              workspaceName={workspace.name}
              systemName={system.name}
              workspaceId={workspaceId}
            />
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-gray-200">
            <button
              onClick={() => setZoom(Math.max(25, zoom - 10))}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} className="text-gray-600" />
            </button>
            <span className="text-xs font-bold text-gray-700 min-w-[45px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} className="text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg transition-colors ${
                showGrid ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle Grid"
            >
              <Grid3x3 size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Collaborators">
              <Users size={18} className="text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Share">
              <Share2 size={18} className="text-gray-600" />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button
              onClick={handleEvaluate}
              className="px-4 py-2 bg-gray-900 text-white rounded-md font-medium hover:bg-black transition-colors text-sm flex items-center gap-2"
            >
              <Play size={14} />
              Evaluate
            </button>
            <button
              onClick={handlePresent}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
            >
              <Play size={14} />
              Present
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
            >
              <FileDown size={14} />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-60 border-r border-gray-200 bg-white flex flex-col">
          {/* Tools Section */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Tools
            </h3>
            <div className="space-y-1.5">
              {tools.map((tool) => (
                <ToolButton
                  key={tool.id}
                  icon={tool.icon}
                  label={tool.label}
                  badge={tool.badge}
                  active={activeTool === tool.id}
                  onClick={() => setActiveTool(tool.id)}
                />
              ))}
            </div>
          </div>

          {/* Components Section */}
          <div className="flex-1 p-3 overflow-y-auto">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Components
            </h3>
            <div className="space-y-1.5">
              {components.map((comp) => (
                <ToolButton
                  key={comp.id}
                  icon={comp.icon}
                  label={comp.label}
                  active={activeComponent === comp.id}
                  onClick={() => setActiveComponent(comp.id)}
                />
              ))}
            </div>
          </div>

          {/* History Controls */}
          <div className="p-3 border-t border-gray-100 space-y-1.5">
            <button className="w-full p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 text-xs text-gray-600" title="Undo">
              <Undo size={14} className="text-gray-600" />
              Undo
            </button>
            <button className="w-full p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 text-xs text-gray-600" title="Redo">
              <Redo size={14} className="text-gray-600" />
              Redo
            </button>
          </div>
        </aside>

        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area */}
          <main className="flex-1 relative overflow-hidden bg-[#f8fafc]">
            {/* Grid Background */}
            {showGrid && (
              <div 
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: '24px 24px'
                }}
              />
            )}

            {/* Canvas Content */}
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[720px] h-[420px] bg-white/70 border border-gray-200 rounded-xl shadow-sm">
                <div className="absolute left-8 top-10 w-36 h-20 bg-white border border-gray-300 rounded-md shadow-sm p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Web App</p>
                  <p className="text-[11px] text-gray-500">React Client</p>
                </div>
                <div className="absolute left-[290px] top-10 w-36 h-20 bg-white border border-gray-300 rounded-md shadow-sm p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">API</p>
                  <p className="text-[11px] text-gray-500">Gateway</p>
                </div>
                <div className="absolute right-8 top-10 w-36 h-20 bg-white border border-gray-300 rounded-md shadow-sm p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Database</p>
                  <p className="text-[11px] text-gray-500">PostgreSQL</p>
                </div>
                <div className="absolute left-[180px] top-[50px] w-[110px] h-[2px] bg-gray-400" />
                <div className="absolute left-[430px] top-[50px] w-[110px] h-[2px] bg-gray-400" />
              </div>

              <div className="absolute left-1/2 top-[64%] -translate-x-1/2 w-[460px] rounded-lg border border-dashed border-gray-300 bg-white/90 px-6 py-5 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800">Drop components to start modeling</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Use the left panel to add nodes, then connect them to describe your system flow.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button className="px-3 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-1.5">
                    <Plus size={14} />
                    Add Component
                  </button>
                  <button className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors text-sm flex items-center gap-1.5">
                    <Search size={14} />
                    Browse Templates
                  </button>
                </div>
              </div>
            </div>

            {/* Mini Toolbar */}
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-sm border border-gray-200 p-1.5 flex items-center gap-1">
              <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Save">
                <Save size={14} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Refresh">
                <RefreshCw size={14} className="text-gray-600" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1"></div>
              <button className="px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-700 flex items-center gap-1.5">
                Layers
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Status Bar - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-700">System:</span> {system.name}
                </span>
                <div className="w-px h-4 bg-gray-300"></div>
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-700">Components:</span> 3
                </span>
                <div className="w-px h-4 bg-gray-300"></div>
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-700">Connections:</span> 2
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">Live</span>
                </div>
                <span className="text-xs text-gray-400">Auto-saved just now</span>
              </div>
            </div>
          </main>

          {/* Properties Panel */}
          <aside className="w-72 border-l border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Properties</h3>
            <div className="space-y-3">
              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Selected Item</p>
                <p className="text-sm font-medium text-gray-800 mt-1">
                  {activeComponent ? components.find((item) => item.id === activeComponent)?.label : "None"}
                </p>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <label className="text-xs text-gray-500 block mb-1">Label</label>
                <input
                  type="text"
                  placeholder="Component label"
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <textarea
                  rows={4}
                  placeholder="Describe this component..."
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
