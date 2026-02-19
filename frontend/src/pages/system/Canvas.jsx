import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Database,
  Globe,
  Lock,
  Zap,
  Layers,
  Box,
  Monitor,
  Hand,
  MousePointer2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import api from '../../api';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 96;
const AUTOSAVE_DEBOUNCE_MS = 650;

const COMPONENTS = [
  { type: 'CLIENT', label: 'Client', icon: Monitor },
  { type: 'API', label: 'API', icon: Globe },
  { type: 'DATABASE', label: 'Database', icon: Database },
  { type: 'CACHE', label: 'Cache', icon: Zap },
  { type: 'QUEUE', label: 'Queue', icon: Layers },
  { type: 'AUTH', label: 'Auth', icon: Lock },
  { type: 'EXTERNAL_SERVICE', label: 'External Service', icon: Box },
];

const DEFAULT_CANVAS_STATE = {
  nodes: [],
  edges: [],
  viewport: {
    zoom: 1,
    pan: { x: 0, y: 0 },
  },
};

const toComponentLabel = (type) => {
  const found = COMPONENTS.find((item) => item.type === type);
  return found ? found.label : type;
};

const ensureCanvasState = (value) => {
  if (!value || typeof value !== 'object') return DEFAULT_CANVAS_STATE;

  return {
    nodes: Array.isArray(value.nodes)
      ? value.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          label: typeof node.label === 'string' ? node.label : toComponentLabel(node.type),
          position: {
            x: typeof node?.position?.x === 'number' ? node.position.x : 0,
            y: typeof node?.position?.y === 'number' ? node.position.y : 0,
          },
          metadata: node?.metadata && typeof node.metadata === 'object' ? node.metadata : {},
        }))
      : [],
    edges: Array.isArray(value.edges)
      ? value.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        }))
      : [],
    viewport: {
      zoom: typeof value?.viewport?.zoom === 'number' ? value.viewport.zoom : 1,
      pan: {
        x: typeof value?.viewport?.pan?.x === 'number' ? value.viewport.pan.x : 0,
        y: typeof value?.viewport?.pan?.y === 'number' ? value.viewport.pan.y : 0,
      },
    },
  };
};

const makeUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const canvasToWorld = (canvasX, canvasY, viewport) => ({
  x: (canvasX - viewport.pan.x) / viewport.zoom,
  y: (canvasY - viewport.pan.y) / viewport.zoom,
});

const worldToScreen = (worldX, worldY, viewport) => ({
  x: worldX * viewport.zoom + viewport.pan.x,
  y: worldY * viewport.zoom + viewport.pan.y,
});

const Canvas = () => {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();

  const canvasRef = useRef(null);
  const autosaveDebounceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const draggingNodeRef = useRef(null);
  const panningRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [system, setSystem] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTool, setActiveTool] = useState('select');

  const [canvasState, setCanvasState] = useState(DEFAULT_CANVAS_STATE);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [connectionDraft, setConnectionDraft] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');

  const lastSavedSignatureRef = useRef('');
  const retryAttemptRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [systemRes, workspaceRes, userRes] = await Promise.all([
          api.get(`workspaces/${workspaceId}/canvases/${systemId}/`, { cache: false }),
          api.get(`workspaces/${workspaceId}/`, { cache: false }),
          api.get('auth/profile/', { cache: false }),
        ]);

        const serverCanvasState = ensureCanvasState(
          systemRes.data.canvas_state || systemRes.data.canvas_data || DEFAULT_CANVAS_STATE
        );

        setSystem(systemRes.data);
        setWorkspace(workspaceRes.data);
        setUser(userRes.data);
        setCanvasState(serverCanvasState);
        lastSavedSignatureRef.current = JSON.stringify(serverCanvasState);
      } catch (error) {
        console.error('Failed to load canvas', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, systemId]);

  const saveCanvasState = useCallback(
    async (nextState, signature) => {
      setSaveStatus('saving');
      try {
        await api.put(`systems/${systemId}/canvas/`, { canvasState: nextState });
        lastSavedSignatureRef.current = signature;
        retryAttemptRef.current = 0;
        setSaveStatus('saved');
      } catch (error) {
        retryAttemptRef.current += 1;
        setSaveStatus('retrying');

        const retryDelay = Math.min(5000, 1000 * retryAttemptRef.current);
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          saveCanvasState(nextState, signature);
        }, retryDelay);
      }
    },
    [systemId]
  );

  useEffect(() => {
    if (loading || !system) return;

    const signature = JSON.stringify(canvasState);
    if (signature === lastSavedSignatureRef.current) return;

    clearTimeout(autosaveDebounceRef.current);
    autosaveDebounceRef.current = setTimeout(() => {
      saveCanvasState(canvasState, signature);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(autosaveDebounceRef.current);
    };
  }, [canvasState, loading, saveCanvasState, system]);

  useEffect(() => {
    return () => {
      clearTimeout(autosaveDebounceRef.current);
      clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const updateViewport = useCallback((updater) => {
    setCanvasState((prev) => ({
      ...prev,
      viewport: typeof updater === 'function' ? updater(prev.viewport) : updater,
    }));
  }, []);

  const handleDropComponent = (event) => {
    event.preventDefault();
    const componentType = event.dataTransfer.getData('application/structra-component-type');
    if (!componentType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const world = canvasToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
      canvasState.viewport
    );

    const newNode = {
      id: makeUuid(),
      type: componentType,
      label: toComponentLabel(componentType),
      position: { x: world.x - NODE_WIDTH / 2, y: world.y - NODE_HEIGHT / 2 },
      metadata: {},
    };

    setCanvasState((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  const onNodeMouseDown = (event, node) => {
    if (activeTool !== 'select') return;
    if (event.button !== 0) return;

    draggingNodeRef.current = {
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: node.position.x,
      startY: node.position.y,
    };

    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const onCanvasMouseDown = (event) => {
    const isRightMouseButton = event.button === 2;
    const isPanToolLeftClick = activeTool === 'pan' && event.button === 0;
    if (!isRightMouseButton && !isPanToolLeftClick) return;
    if (isRightMouseButton) {
      event.preventDefault();
    }

    panningRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: canvasState.viewport.pan.x,
      startPanY: canvasState.viewport.pan.y,
    };
  };

  useEffect(() => {
    const onMouseMove = (event) => {
      if (draggingNodeRef.current) {
        const drag = draggingNodeRef.current;
        const deltaX = (event.clientX - drag.startClientX) / canvasState.viewport.zoom;
        const deltaY = (event.clientY - drag.startClientY) / canvasState.viewport.zoom;

        setCanvasState((prev) => ({
          ...prev,
          nodes: prev.nodes.map((node) =>
            node.id === drag.nodeId
              ? {
                  ...node,
                  position: {
                    x: drag.startX + deltaX,
                    y: drag.startY + deltaY,
                  },
                }
              : node
          ),
        }));
      }

      if (panningRef.current) {
        const pan = panningRef.current;
        updateViewport((prevViewport) => ({
          ...prevViewport,
          pan: {
            x: pan.startPanX + (event.clientX - pan.startClientX),
            y: pan.startPanY + (event.clientY - pan.startClientY),
          },
        }));
      }

      if (connectionDraft) {
        setConnectionDraft((prev) =>
          prev
            ? {
                ...prev,
                pointer: { x: event.clientX, y: event.clientY },
              }
            : prev
        );
      }
    };

    const onMouseUp = () => {
      draggingNodeRef.current = null;
      panningRef.current = null;
      if (connectionDraft) {
        setConnectionDraft(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasState.viewport.zoom, connectionDraft, updateViewport]);

  const startConnection = (event, nodeId) => {
    event.stopPropagation();
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setConnectionDraft({ sourceId: nodeId, pointer: { x: event.clientX, y: event.clientY } });
  };

  const completeConnection = (event, targetNodeId) => {
    event.stopPropagation();
    if (!connectionDraft) return;

    const source = connectionDraft.sourceId;
    const target = targetNodeId;

    const duplicate = canvasState.edges.some(
      (edge) => edge.source === source && edge.target === target
    );

    if (!duplicate) {
      const nextEdge = { id: makeUuid(), source, target };
      setCanvasState((prev) => ({ ...prev, edges: [...prev.edges, nextEdge] }));
      setSelectedEdgeId(nextEdge.id);
      setSelectedNodeId(null);
    }

    setConnectionDraft(null);
  };

  const selectedNode = useMemo(
    () => canvasState.nodes.find((node) => node.id === selectedNodeId) || null,
    [canvasState.nodes, selectedNodeId]
  );

  const setNodeLabel = (label) => {
    if (!selectedNodeId) return;
    setCanvasState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              label,
            }
          : node
      ),
    }));
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setCanvasState((prev) => ({
      ...prev,
      edges: prev.edges.filter((edge) => edge.id !== selectedEdgeId),
    }));
    setSelectedEdgeId(null);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setCanvasState((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((node) => node.id !== selectedNodeId),
      edges: prev.edges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId
      ),
    }));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const zoomPercent = Math.round(canvasState.viewport.zoom * 100);

  const getNodeScreenAnchor = (node, anchor) => {
    const worldX = anchor === 'source' ? node.position.x + NODE_WIDTH : node.position.x;
    const worldY = node.position.y + NODE_HEIGHT / 2;
    return worldToScreen(worldX, worldY, canvasState.viewport);
  };

  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving...'
      : saveStatus === 'retrying'
      ? 'Saving...'
      : 'Saved';
  const nodeZoom = canvasState.viewport.zoom;
  const nodePadding = Math.max(6, Math.round(12 * nodeZoom));
  const nodeTypeFontSize = Math.max(8, Math.round(12 * nodeZoom));
  const nodeLabelFontSize = Math.max(10, Math.round(16 * nodeZoom));
  const nodeIdFontSize = Math.max(8, Math.round(12 * nodeZoom));
  const nodeIconSize = Math.max(10, Math.round(14 * nodeZoom));

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Loading canvas...</div>;
  }

  if (!workspace || !system || !user) {
    return <div className="h-screen flex items-center justify-center text-red-600">Failed to load canvas.</div>;
  }

  const creatorName = user.full_name || user.email;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <header className="border-b border-gray-200 bg-white px-5 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-700 border border-gray-200 rounded-md px-2.5 py-1.5 max-w-[520px] truncate">
            <button
              type="button"
              onClick={() => navigate('/app/profile')}
              className="text-blue-600 hover:text-blue-700 hover:underline"
              title={creatorName}
            >
              {creatorName}
            </button>
            <span className="text-gray-400 px-1">/</span>
            <button
              type="button"
              onClick={() => navigate(`/app/ws/${workspaceId}`)}
              className="text-blue-600 hover:text-blue-700 hover:underline"
              title={workspace.name}
            >
              {workspace.name}
            </button>
            <span className="text-gray-400 px-1">/</span>
            <span className="text-gray-700" title={system.name}>
              {system.name}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-md text-sm border ${
              activeTool === 'select' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-700 border-gray-300'
            }`}
            onClick={() => setActiveTool('select')}
            type="button"
          >
            <MousePointer2 size={14} className="inline mr-1" />
            Select
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm border ${
              activeTool === 'pan' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-700 border-gray-300'
            }`}
            onClick={() => setActiveTool('pan')}
            type="button"
          >
            <Hand size={14} className="inline mr-1" />
            Pan
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={() =>
              updateViewport((prev) => ({
                ...prev,
                zoom: Math.max(0.4, +(prev.zoom - 0.1).toFixed(2)),
              }))
            }
            className="p-2 rounded border border-gray-300 text-gray-700"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-sm text-gray-700 min-w-[54px] text-center">{zoomPercent}%</span>
          <button
            type="button"
            onClick={() =>
              updateViewport((prev) => ({
                ...prev,
                zoom: Math.min(2.5, +(prev.zoom + 0.1).toFixed(2)),
              }))
            }
            className="p-2 rounded border border-gray-300 text-gray-700"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            type="button"
            className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Components</h2>
          <div className="space-y-2">
            {COMPONENTS.map((component) => {
              const Icon = component.icon;
              return (
                <div
                  key={component.type}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData('application/structra-component-type', component.type)
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 flex items-center gap-2 cursor-grab"
                >
                  <Icon size={14} className="text-gray-500" />
                  {component.label}
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-200 space-y-2">
            <button
              type="button"
              disabled={!selectedNodeId}
              onClick={deleteSelectedNode}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-40"
            >
              Delete Selected Node
            </button>
            <button
              type="button"
              disabled={!selectedEdgeId}
              onClick={deleteSelectedEdge}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-40"
            >
              <Trash2 size={14} className="inline mr-1" />
              Delete Selected Edge
            </button>
          </div>
        </aside>

        <main className="flex-1 flex">
          <section
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            onContextMenu={(event) => event.preventDefault()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropComponent}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            className="relative flex-1 overflow-hidden bg-slate-50"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              {canvasState.edges.map((edge) => {
                const sourceNode = canvasState.nodes.find((node) => node.id === edge.source);
                const targetNode = canvasState.nodes.find((node) => node.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const sourcePoint = getNodeScreenAnchor(sourceNode, 'source');
                const targetPoint = getNodeScreenAnchor(targetNode, 'target');
                const midX = (sourcePoint.x + targetPoint.x) / 2;

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${sourcePoint.x} ${sourcePoint.y} C ${midX} ${sourcePoint.y}, ${midX} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`}
                      stroke={selectedEdgeId === edge.id ? '#1d4ed8' : '#475569'}
                      strokeWidth={selectedEdgeId === edge.id ? 2.5 : 2}
                      fill="none"
                    />
                    <path
                      d={`M ${sourcePoint.x} ${sourcePoint.y} C ${midX} ${sourcePoint.y}, ${midX} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`}
                      stroke="transparent"
                      strokeWidth="12"
                      fill="none"
                      className="pointer-events-auto cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                      }}
                    />
                  </g>
                );
              })}

              {connectionDraft && (() => {
                const sourceNode = canvasState.nodes.find((node) => node.id === connectionDraft.sourceId);
                if (!sourceNode || !canvasRef.current) return null;
                const rect = canvasRef.current.getBoundingClientRect();
                const sourcePoint = getNodeScreenAnchor(sourceNode, 'source');
                const targetX = connectionDraft.pointer.x - rect.left;
                const targetY = connectionDraft.pointer.y - rect.top;
                return (
                  <line
                    x1={sourcePoint.x}
                    y1={sourcePoint.y}
                    x2={targetX}
                    y2={targetY}
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                );
              })()}
            </svg>

            {canvasState.nodes.map((node) => {
              const screen = worldToScreen(node.position.x, node.position.y, canvasState.viewport);
              const component = COMPONENTS.find((item) => item.type === node.type);
              const Icon = component ? component.icon : Box;
              return (
                <div
                  key={node.id}
                  className={`absolute bg-white border rounded-lg shadow-sm ${
                    selectedNodeId === node.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'
                  }`}
                  style={{
                    width: NODE_WIDTH * canvasState.viewport.zoom,
                    height: NODE_HEIGHT * canvasState.viewport.zoom,
                    left: screen.x,
                    top: screen.y,
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onNodeMouseDown(event, node);
                  }}
                >
                  <button
                    type="button"
                    aria-label="Start connection"
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white"
                    onMouseDown={(event) => startConnection(event, node.id)}
                  />
                  <button
                    type="button"
                    aria-label="Connect here"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-500 border-2 border-white"
                    onMouseUp={(event) => completeConnection(event, node.id)}
                    onMouseDown={(event) => startConnection(event, node.id)}
                  />

                  <div style={{ padding: nodePadding }}>
                    <div
                      className="flex items-center gap-2 text-gray-500 uppercase tracking-wide"
                      style={{ fontSize: nodeTypeFontSize, lineHeight: 1.15 }}
                    >
                      <Icon size={nodeIconSize} />
                      {node.type}
                    </div>
                    <p
                      className="mt-2 font-semibold text-gray-900 truncate"
                      style={{ fontSize: nodeLabelFontSize, lineHeight: 1.15 }}
                    >
                      {node.label || 'Untitled'}
                    </p>
                  <p className="mt-1 text-gray-500" style={{ fontSize: nodeIdFontSize, lineHeight: 1.15 }}>
                      {node.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              );
            })}

            {canvasState.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 border border-dashed border-gray-300 rounded-xl px-5 py-4 text-center">
                  <p className="text-sm font-medium text-gray-700">Drag components from the left panel to start.</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md border border-gray-200 bg-white/90 text-xs text-gray-600">
              {saveLabel}
            </div>
          </section>

          <aside className="w-72 border-l border-gray-200 bg-white p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Properties</h2>

            <div className="rounded-md border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Selected Node</p>
              <p className="text-sm text-gray-800 mt-1">{selectedNode ? selectedNode.type : 'None'}</p>
            </div>

            <div className="rounded-md border border-gray-200 p-3">
              <label className="text-xs text-gray-500 block mb-1">Label</label>
              <input
                type="text"
                disabled={!selectedNode}
                value={selectedNode?.label || ''}
                onChange={(event) => setNodeLabel(event.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm disabled:bg-gray-100"
                placeholder="Select a node"
              />
            </div>

            <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-600 space-y-1">
              <p>
                Nodes: <span className="font-semibold text-gray-900">{canvasState.nodes.length}</span>
              </p>
              <p>
                Edges: <span className="font-semibold text-gray-900">{canvasState.edges.length}</span>
              </p>
              <p>
                User: <span className="font-semibold text-gray-900">{user.full_name || user.email}</span>
              </p>
            </div>

            <div className="text-xs text-gray-500 flex items-start gap-2">
              <Plus size={12} className="mt-0.5" />
              Blue and black dots are connection handles. Drag from one node handle to another to connect.
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default Canvas;
