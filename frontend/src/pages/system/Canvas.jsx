import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  Archive,
  BarChart3,
  Box,
  Cpu,
  Database,
  Monitor,
  Network,
  Radio,
  Scale,
  Settings,
  Shield,
  Zap,
  Hand,
  MousePointer2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  X,
  Undo2,
  Redo2,
  MessageSquare,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight,
  Moon,
  Sun,
  Type,
  Square,
} from 'lucide-react';
import api from '../../api';
import LoadingState from '../../components/LoadingState';
import { useTheme } from '../../contexts/ThemeContext';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 96;
const AUTOSAVE_DEBOUNCE_MS = 650;
const MOBILE_MAX_WIDTH = 767;
const LEFT_PANEL_ITEMS = [
  { id: 'components', label: 'Components', icon: Box },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'bounds', label: 'Bounds', icon: Square },
];

const COMPONENT_CATEGORIES = [
  {
    key: 'CLIENT_ENTRY_LAYER',
    label: 'Client & Entry Layer',
    icon: Monitor,
    components: [
      { type: 'CLIENT', label: 'Client', description: 'End-user application that initiates requests into the system.' },
      { type: 'DNS', label: 'DNS', description: 'Resolves domain names to system entry points.' },
      { type: 'CDN_EDGE_CACHE', label: 'CDN / Edge Cache', description: 'Caches and serves content close to users to reduce latency.' },
      { type: 'LOAD_BALANCER', label: 'Load Balancer', description: 'Distributes incoming traffic across multiple backend instances.' },
    ],
  },
  {
    key: 'SECURITY_IDENTITY',
    label: 'Security & Identity',
    icon: Shield,
    components: [
      { type: 'AUTHENTICATION_SERVICE', label: 'Authentication Service', description: 'Verifies user or service identity.' },
      { type: 'AUTHORIZATION_SERVICE', label: 'Authorization Service', description: 'Determines permissions and access scopes.' },
      { type: 'API_GATEWAY', label: 'API Gateway', description: 'Central ingress enforcing routing, auth, and traffic policies.' },
      { type: 'WEB_APPLICATION_FIREWALL', label: 'Web Application Firewall (WAF)', description: 'Filters malicious or abusive traffic.' },
      { type: 'SECRETS_MANAGER', label: 'Secrets Manager', description: 'Securely stores and rotates sensitive credentials.' },
    ],
  },
  {
    key: 'APPLICATION_COMPUTE',
    label: 'Application & Compute',
    icon: Cpu,
    components: [
      { type: 'API_BACKEND_SERVICE', label: 'API / Backend Service', description: 'Handles synchronous request-response business logic.' },
      { type: 'MICROSERVICE', label: 'Microservice', description: 'Independently deployable service with a single responsibility.' },
      { type: 'BACKGROUND_WORKER', label: 'Background Worker', description: 'Processes asynchronous or long-running tasks.' },
      { type: 'SERVERLESS_FUNCTION', label: 'Serverless Function', description: 'Event-driven, ephemeral compute unit.' },
      { type: 'BATCH_JOB', label: 'Batch Job', description: 'Finite or scheduled compute workload.' },
    ],
  },
  {
    key: 'DATA_STORAGE',
    label: 'Data Storage',
    icon: Database,
    components: [
      { type: 'RELATIONAL_DATABASE', label: 'Relational Database', description: 'Transactional, strongly consistent structured data store.' },
      { type: 'NOSQL_DATABASE', label: 'NoSQL Database', description: 'Highly scalable, schema-flexible data store.' },
      { type: 'OBJECT_STORAGE', label: 'Object Storage', description: 'Stores unstructured binary data (files, media, backups).' },
      { type: 'TIME_SERIES_DATABASE', label: 'Time-Series Database', description: 'Optimized storage for time-indexed metrics and events.' },
    ],
  },
  {
    key: 'CACHING_PERFORMANCE',
    label: 'Caching & Performance',
    icon: Zap,
    components: [
      { type: 'CACHE', label: 'Cache', description: 'Stores frequently accessed data to reduce latency.' },
      { type: 'IN_MEMORY_STORE', label: 'In-Memory Store', description: 'Fast, ephemeral store for sessions and counters.' },
      { type: 'SEARCH_ENGINE', label: 'Search Engine', description: 'Indexes data for fast text and filtered queries.' },
    ],
  },
  {
    key: 'MESSAGING_EVENTING',
    label: 'Messaging & Eventing',
    icon: Radio,
    components: [
      { type: 'MESSAGE_QUEUE', label: 'Message Queue', description: 'Buffers and decouples asynchronous workloads.' },
      { type: 'EVENT_BUS', label: 'Event Bus', description: 'Publishes events to multiple subscribers.' },
      { type: 'STREAM_PROCESSOR', label: 'Stream Processor', description: 'Processes continuous ordered event streams.' },
    ],
  },
  {
    key: 'NETWORKING_CONNECTIVITY',
    label: 'Networking & Connectivity',
    icon: Network,
    components: [
      { type: 'INTERNAL_NETWORK', label: 'Internal Network', description: 'Private communication layer between system components.' },
      { type: 'SERVICE_MESH', label: 'Service Mesh', description: 'Manages service-to-service communication and policies.' },
      { type: 'EXTERNAL_SERVICE', label: 'External Service', description: 'Third-party dependency outside system control.' },
    ],
  },
  {
    key: 'OBSERVABILITY_RELIABILITY',
    label: 'Observability & Reliability',
    icon: Activity,
    components: [
      { type: 'LOGGING_SYSTEM', label: 'Logging System', description: 'Collects and stores structured application logs.' },
      { type: 'METRICS_SYSTEM', label: 'Metrics System', description: 'Tracks performance, capacity, and health signals.' },
      { type: 'TRACING_SYSTEM', label: 'Tracing System', description: 'Follows requests across distributed services.' },
      { type: 'ALERTING_SYSTEM', label: 'Alerting System', description: 'Notifies operators of failures or anomalies.' },
    ],
  },
  {
    key: 'DEPLOYMENT_OPERATIONS',
    label: 'Deployment & Operations',
    icon: Settings,
    components: [
      { type: 'CI_CD_PIPELINE', label: 'CI/CD Pipeline', description: 'Automates build, test, and deployment processes.' },
      { type: 'CONTAINER_RUNTIME', label: 'Container Runtime', description: 'Executes application containers.' },
      { type: 'ORCHESTRATOR', label: 'Orchestrator', description: 'Schedules, scales, and heals workloads.' },
      { type: 'CONFIGURATION_SERVICE', label: 'Configuration Service', description: 'Manages runtime configuration values.' },
    ],
  },
  {
    key: 'DATA_PROTECTION_RECOVERY',
    label: 'Data Protection & Recovery',
    icon: Archive,
    components: [
      { type: 'BACKUP_SERVICE', label: 'Backup Service', description: 'Creates recoverable copies of data.' },
      { type: 'REPLICATION_SYSTEM', label: 'Replication System', description: 'Maintains redundant data copies.' },
      { type: 'DISASTER_RECOVERY_SYSTEM', label: 'Disaster Recovery System', description: 'Restores system after major failures.' },
    ],
  },
  {
    key: 'GOVERNANCE_COMPLIANCE',
    label: 'Governance & Compliance',
    icon: Scale,
    components: [
      { type: 'AUDIT_LOG', label: 'Audit Log', description: 'Records security-sensitive actions.' },
      { type: 'POLICY_ENGINE', label: 'Policy Engine', description: 'Evaluates and enforces system rules.' },
      { type: 'ACCESS_CONTROL_SYSTEM', label: 'Access Control System', description: 'Defines permissions across system resources.' },
    ],
  },
  {
    key: 'ANALYTICS_INTELLIGENCE',
    label: 'Analytics & Intelligence',
    icon: BarChart3,
    components: [
      { type: 'ANALYTICS_ENGINE', label: 'Analytics Engine', description: 'Aggregates and analyzes system or business data.' },
      { type: 'FEATURE_STORE', label: 'Feature Store', description: 'Stores reusable features for ML or experimentation.' },
      { type: 'RECOMMENDATION_ENGINE', label: 'Recommendation Engine', description: 'Generates optimized or personalized outputs.' },
    ],
  },
];

const COMPONENTS = COMPONENT_CATEGORIES.flatMap((category) =>
  category.components.map((component) => ({
    ...component,
    categoryKey: category.key,
    categoryLabel: category.label,
    icon: category.icon,
  }))
);
const COMPONENT_BY_TYPE = new Map(COMPONENTS.map((component) => [component.type, component]));
const ALLOWED_COMPONENT_TYPES = new Set(COMPONENTS.map((component) => component.type));

const LEGACY_NODE_TYPE_ALIASES = {
  API: 'API_BACKEND_SERVICE',
  DATABASE: 'RELATIONAL_DATABASE',
  QUEUE: 'MESSAGE_QUEUE',
  AUTH: 'AUTHENTICATION_SERVICE',
};

const EDGE_PROTOCOL_OPTIONS = ['', 'HTTP', 'ASYNC', 'INTERNAL'];
const NODE_ANCHORS = ['top', 'right', 'bottom', 'left'];
const ANCHOR_OFFSETS = {
  top: { x: NODE_WIDTH / 2, y: 0 },
  right: { x: NODE_WIDTH, y: NODE_HEIGHT / 2 },
  bottom: { x: NODE_WIDTH / 2, y: NODE_HEIGHT },
  left: { x: 0, y: NODE_HEIGHT / 2 },
};
const ANCHOR_DIRECTIONS = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
const DEFAULT_EDGE_BREAKOUT = 42;

const resolveAnchor = (value, fallback = 'right') => (NODE_ANCHORS.includes(value) ? value : fallback);

const isEditableElement = (target) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

const buildOrthogonalPath = (points) => {
  if (!Array.isArray(points) || points.length < 2) {
    return { points: Array.isArray(points) ? points : [], segmentToRawIndex: [] };
  }

  const orthPoints = [points[0]];
  const segmentToRawIndex = [];

  const pushPoint = (point, rawSegmentIndex) => {
    const last = orthPoints[orthPoints.length - 1];
    if (last && last.x === point.x && last.y === point.y) return;
    orthPoints.push(point);
    segmentToRawIndex.push(rawSegmentIndex);
  };

  for (let rawSegmentIndex = 0; rawSegmentIndex < points.length - 1; rawSegmentIndex += 1) {
    const start = orthPoints[orthPoints.length - 1];
    const end = points[rawSegmentIndex + 1];
    if (!start || !end) continue;

    if (start.x === end.x || start.y === end.y) {
      pushPoint(end, rawSegmentIndex);
      continue;
    }

    // Force orthogonal routing: horizontal leg then vertical leg.
    const mid = { x: end.x, y: start.y };
    pushPoint(mid, rawSegmentIndex);
    pushPoint(end, rawSegmentIndex);
  }

  return { points: orthPoints, segmentToRawIndex };
};

const collapseDuplicatePoints = (points) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  const collapsed = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const last = collapsed[collapsed.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) {
      collapsed.push(point);
    }
  }
  return collapsed;
};

const cloneCanvasState = (value) => JSON.parse(JSON.stringify(value));

const DEFAULT_CANVAS_STATE = {
  nodes: [],
  edges: [],
  viewport: {
    zoom: 1,
    pan: { x: 0, y: 0 },
  },
  systemMetadata: {
    goal: '',
    assumptions: [],
    constraints: '',
  },
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string');
};

const normalizePointArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      x: typeof item.x === 'number' ? item.x : 0,
      y: typeof item.y === 'number' ? item.y : 0,
    }));
};

const normalizeNodeType = (type) => {
  const nextType = LEGACY_NODE_TYPE_ALIASES[type] || type;
  return ALLOWED_COMPONENT_TYPES.has(nextType) ? nextType : 'MICROSERVICE';
};

const toComponentLabel = (type) => {
  const found = COMPONENT_BY_TYPE.get(type);
  return found ? found.label : type;
};

const ensureCanvasState = (value) => {
  if (!value || typeof value !== 'object') return DEFAULT_CANVAS_STATE;

  const systemMetadata = value?.systemMetadata && typeof value.systemMetadata === 'object'
    ? value.systemMetadata
    : {};

  return {
    nodes: Array.isArray(value.nodes)
      ? value.nodes.map((node) => ({
          id: node.id,
          type: normalizeNodeType(node.type),
          label:
            typeof node.label === 'string' && node.label.trim()
              ? node.label
              : toComponentLabel(normalizeNodeType(node.type)),
          position: {
            x: typeof node?.position?.x === 'number' ? node.position.x : 0,
            y: typeof node?.position?.y === 'number' ? node.position.y : 0,
          },
          metadata: {
            purpose: typeof node?.metadata?.purpose === 'string' ? node.metadata.purpose : '',
            techChoice: typeof node?.metadata?.techChoice === 'string' ? node.metadata.techChoice : '',
            responsibilities: normalizeStringArray(node?.metadata?.responsibilities),
            notes: typeof node?.metadata?.notes === 'string' ? node.metadata.notes : '',
          },
        }))
      : [],
    edges: Array.isArray(value.edges)
      ? value.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceAnchor: resolveAnchor(edge.sourceAnchor, 'right'),
          targetAnchor: resolveAnchor(edge.targetAnchor, 'left'),
          bends: normalizePointArray(edge.bends),
          metadata: {
            protocol: typeof edge?.metadata?.protocol === 'string' ? edge.metadata.protocol : '',
            notes: typeof edge?.metadata?.notes === 'string' ? edge.metadata.notes : '',
          },
        }))
      : [],
    viewport: {
      zoom: typeof value?.viewport?.zoom === 'number' ? value.viewport.zoom : 1,
      pan: {
        x: typeof value?.viewport?.pan?.x === 'number' ? value.viewport.pan.x : 0,
        y: typeof value?.viewport?.pan?.y === 'number' ? value.viewport.pan.y : 0,
      },
    },
    systemMetadata: {
      goal: typeof systemMetadata.goal === 'string' ? systemMetadata.goal : '',
      assumptions: normalizeStringArray(systemMetadata.assumptions),
      constraints: typeof systemMetadata.constraints === 'string' ? systemMetadata.constraints : '',
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

const INSIGHT_CATEGORIES = {
  CONNECTIVITY: 'CONNECTIVITY',
  COMPUTE: 'COMPUTE',
  DATA: 'DATA',
  SECURITY: 'SECURITY',
  RELIABILITY: 'RELIABILITY',
  OBSERVABILITY: 'OBSERVABILITY',
  CANVAS_INTEGRITY: 'CANVAS_INTEGRITY',
};

const PUBLIC_ENTRY_TYPES = new Set(['CLIENT', 'EXTERNAL_SERVICE']);
const CLIENT_GUARD_TYPES = new Set([
  'CDN_EDGE_CACHE',
  'API_GATEWAY',
  'LOAD_BALANCER',
  'WEB_APPLICATION_FIREWALL',
]);
const DATA_STORAGE_TYPES = new Set([
  'RELATIONAL_DATABASE',
  'NOSQL_DATABASE',
  'OBJECT_STORAGE',
  'TIME_SERIES_DATABASE',
]);
const COMPUTE_TYPES = new Set([
  'API_BACKEND_SERVICE',
  'MICROSERVICE',
  'BACKGROUND_WORKER',
  'SERVERLESS_FUNCTION',
  'BATCH_JOB',
]);
const WORKER_TYPES = new Set(['BACKGROUND_WORKER', 'BATCH_JOB']);
const ASYNC_BOUNDARY_TYPES = new Set(['MESSAGE_QUEUE', 'EVENT_BUS', 'STREAM_PROCESSOR']);
const ANALYTICS_TYPES = new Set(['ANALYTICS_ENGINE', 'FEATURE_STORE', 'RECOMMENDATION_ENGINE']);
const OBSERVABILITY_TYPES = new Set([
  'LOGGING_SYSTEM',
  'METRICS_SYSTEM',
  'TRACING_SYSTEM',
  'ALERTING_SYSTEM',
]);
const AUTH_GUARD_TYPES = new Set([
  'AUTHENTICATION_SERVICE',
  'AUTHORIZATION_SERVICE',
  'API_GATEWAY',
  'WEB_APPLICATION_FIREWALL',
  'ACCESS_CONTROL_SYSTEM',
]);

const buildInsight = ({ category, message, relatedNodeIds = [], relatedEdgeIds = [] }) => ({
  id: `${category}:${message}:${relatedNodeIds.join(',')}:${relatedEdgeIds.join(',')}`,
  category,
  message,
  relatedNodeIds,
  relatedEdgeIds,
});

const computeInsights = (canvasState) => {
  const nodes = Array.isArray(canvasState?.nodes) ? canvasState.nodes : [];
  const edges = Array.isArray(canvasState?.edges) ? canvasState.edges : [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  const outgoingCount = new Map(nodes.map((node) => [node.id, 0]));
  const outgoingByNode = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    if (incomingCount.has(edge.target)) {
      incomingCount.set(edge.target, incomingCount.get(edge.target) + 1);
    }
    if (outgoingCount.has(edge.source)) {
      outgoingCount.set(edge.source, outgoingCount.get(edge.source) + 1);
    }
    if (outgoingByNode.has(edge.source)) {
      outgoingByNode.get(edge.source).push(edge);
    }
  });

  const insights = [];
  const hasMetadataKeyword = (node, patterns) => {
    const text = `${node?.metadata?.purpose || ''} ${node?.metadata?.techChoice || ''} ${
      node?.metadata?.notes || ''
    }`.toLowerCase();
    return patterns.some((pattern) => text.includes(pattern));
  };

  // G.1: Isolated components are flagged.
  nodes.forEach((node) => {
    const inCount = incomingCount.get(node.id) || 0;
    const outCount = outgoingCount.get(node.id) || 0;
    if (inCount + outCount === 0) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.CANVAS_INTEGRITY,
          message: `${node.label || node.type} is isolated with no incoming or outgoing connections.`,
          relatedNodeIds: [node.id],
        })
      );
    }
  });

  // G.2: Missing metadata reduces confidence.
  const nodesMissingPurpose = nodes.filter((node) => !String(node?.metadata?.purpose || '').trim());
  const nodesMissingResponsibilities = nodes.filter((node) => {
    const responsibilities = Array.isArray(node?.metadata?.responsibilities)
      ? node.metadata.responsibilities.filter((item) => String(item || '').trim())
      : [];
    return responsibilities.length === 0;
  });
  if (nodesMissingPurpose.length > 0) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.CANVAS_INTEGRITY,
        message: `${nodesMissingPurpose.length} component(s) have no stated purpose. Insight confidence is reduced.`,
        relatedNodeIds: nodesMissingPurpose.map((node) => node.id),
      })
    );
  }
  if (nodesMissingResponsibilities.length > 0) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.CANVAS_INTEGRITY,
        message: `${nodesMissingResponsibilities.length} component(s) have no listed responsibilities.`,
        relatedNodeIds: nodesMissingResponsibilities.map((node) => node.id),
      })
    );
  }

  // A.1 + A.2 + A.3
  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    if (sourceNode.type === 'CLIENT' && DATA_STORAGE_TYPES.has(targetNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.CONNECTIVITY,
          message: `Client traffic should not directly connect to data storage (${targetNode.label || targetNode.type}).`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }

    if (sourceNode.type === 'CLIENT' && !CLIENT_GUARD_TYPES.has(targetNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.CONNECTIVITY,
          message: `Client traffic should pass through Edge, Gateway, or Load Balancer before reaching ${targetNode.label || targetNode.type}.`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }

    const touchesExternal = sourceNode.type === 'EXTERNAL_SERVICE' || targetNode.type === 'EXTERNAL_SERVICE';
    const edgeNotes = String(edge?.metadata?.notes || '').trim();
    if (touchesExternal && !edgeNotes) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.CONNECTIVITY,
          message: `Connection ${sourceNode.label || sourceNode.type} -> ${targetNode.label || targetNode.type} crosses a trust boundary. Add notes for trust assumptions.`,
          relatedNodeIds: [edge.source, edge.target],
          relatedEdgeIds: [edge.id],
        })
      );
    }
  });

  nodes
    .filter((node) => node.type === 'EXTERNAL_SERVICE' && !String(node?.metadata?.notes || '').trim())
    .forEach((node) => {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.CONNECTIVITY,
          message: `${node.label || node.type} should describe its trust boundary in notes.`,
          relatedNodeIds: [node.id],
        })
      );
    });

  // A.4: Bidirectional connections require explicit justification.
  const edgeMap = new Map(edges.map((edge) => [`${edge.source}=>${edge.target}`, edge]));
  edges.forEach((edge) => {
    const reverse = edgeMap.get(`${edge.target}=>${edge.source}`);
    if (!reverse || edge.id > reverse.id) return;
    if (!String(edge?.metadata?.notes || '').trim() && !String(reverse?.metadata?.notes || '').trim()) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.CONNECTIVITY,
          message: `Bidirectional traffic between ${sourceNode?.label || 'Unknown'} and ${
            targetNode?.label || 'Unknown'
          } should include explicit justification.`,
          relatedNodeIds: [edge.source, edge.target],
          relatedEdgeIds: [edge.id, reverse.id],
        })
      );
    }
  });

  // B.2 + B.3
  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    if (sourceNode.type === 'CLIENT' && WORKER_TYPES.has(targetNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.COMPUTE,
          message: `${targetNode.label || targetNode.type} should not directly serve client traffic.`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }

    if (targetNode.type === 'CLIENT' && WORKER_TYPES.has(sourceNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.COMPUTE,
          message: `${sourceNode.label || sourceNode.type} should not directly return traffic to clients.`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }
  });

  nodes
    .filter((node) => node.type === 'SERVERLESS_FUNCTION')
    .forEach((node) => {
      if (hasMetadataKeyword(node, ['stateful', 'sticky session', 'in-memory session'])) {
        insights.push(
          buildInsight({
            category: INSIGHT_CATEGORIES.COMPUTE,
            message: `${node.label || node.type} appears to hold persistent state. Serverless functions should stay ephemeral.`,
            relatedNodeIds: [node.id],
          })
        );
      }
    });

  // B.1
  const statelessUnspecified = nodes.filter(
    (node) =>
      COMPUTE_TYPES.has(node.type) &&
      !hasMetadataKeyword(node, ['stateless', 'session', 'state strategy', 'externalized state'])
  );
  if (statelessUnspecified.length > 0) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.COMPUTE,
        message: `${statelessUnspecified.length} compute component(s) do not document statelessness/session strategy.`,
        relatedNodeIds: statelessUnspecified.map((node) => node.id),
      })
    );
  }

  // B.4: Synchronous dependency chain risk (> 3 hops).
  const synchronousEdges = edges.filter(
    (edge) => String(edge?.metadata?.protocol || '').toUpperCase() !== 'ASYNC'
  );
  const syncAdjacency = new Map(nodes.map((node) => [node.id, []]));
  synchronousEdges.forEach((edge) => {
    if (!syncAdjacency.has(edge.source)) return;
    syncAdjacency.get(edge.source).push(edge.target);
  });
  const maxSyncDepthFrom = (startId, visited = new Set()) => {
    if (visited.has(startId)) return 0;
    visited.add(startId);
    const children = syncAdjacency.get(startId) || [];
    let best = 0;
    children.forEach((childId) => {
      const depth = 1 + maxSyncDepthFrom(childId, new Set(visited));
      if (depth > best) best = depth;
    });
    return best;
  };
  const maxSyncHops = nodes.reduce((maxDepth, node) => Math.max(maxDepth, maxSyncDepthFrom(node.id)), 0);
  if (maxSyncHops > 3) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.COMPUTE,
        message: `Synchronous dependency chain reaches ${maxSyncHops} hops. Chains longer than 3 hops are risky.`,
      })
    );
  }

  // C.1 + C.2 + C.3
  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    if (DATA_STORAGE_TYPES.has(sourceNode.type) && COMPUTE_TYPES.has(targetNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.DATA,
          message: `${sourceNode.label || sourceNode.type} should not depend on compute component ${targetNode.label || targetNode.type}.`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }
  });

  nodes
    .filter((node) => node.type === 'CACHE' || node.type === 'IN_MEMORY_STORE')
    .forEach((node) => {
      const hasBackingStore = edges.some(
        (edge) =>
          (edge.source === node.id && DATA_STORAGE_TYPES.has(nodeMap.get(edge.target)?.type)) ||
          (edge.target === node.id && DATA_STORAGE_TYPES.has(nodeMap.get(edge.source)?.type))
      );
      if (!hasBackingStore) {
        insights.push(
          buildInsight({
            category: INSIGHT_CATEGORIES.DATA,
            message: `${node.label || node.type} has no connection to a backing data store.`,
            relatedNodeIds: [node.id],
          })
        );
      }
    });

  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;
    if (ANALYTICS_TYPES.has(sourceNode.type) && PUBLIC_ENTRY_TYPES.has(targetNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.DATA,
          message: `${sourceNode.label || sourceNode.type} should not be on request-critical paths.`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }
  });

  // D.1 + D.2 + D.3
  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.type === 'CLIENT' && COMPUTE_TYPES.has(targetNode.type)) {
      insights.push(
        buildInsight({
          category: INSIGHT_CATEGORIES.SECURITY,
          message: `Client requests should be authenticated/guarded before reaching ${targetNode.label || targetNode.type}.`,
          relatedNodeIds: [sourceNode.id, targetNode.id],
          relatedEdgeIds: [edge.id],
        })
      );
    }
  });

  const hasPublicExposure = nodes.some((node) => PUBLIC_ENTRY_TYPES.has(node.type));
  const hasAuthGuard = nodes.some((node) => AUTH_GUARD_TYPES.has(node.type));
  if (hasPublicExposure && !hasAuthGuard) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.SECURITY,
        message: 'Public-facing system has no authentication/authorization guard component.',
        relatedNodeIds: nodes.filter((node) => PUBLIC_ENTRY_TYPES.has(node.type)).map((node) => node.id),
      })
    );
  }

  nodes
    .filter((node) => COMPUTE_TYPES.has(node.type))
    .forEach((node) => {
      if (hasMetadataKeyword(node, ['password', 'secret', 'api key', 'token', 'credential'])) {
        insights.push(
          buildInsight({
            category: INSIGHT_CATEGORIES.SECURITY,
            message: `${node.label || node.type} metadata suggests embedded secrets. Use a Secrets Manager.`,
            relatedNodeIds: [node.id],
          })
        );
      }
    });

  const internalServiceCount = nodes.filter(
    (node) => COMPUTE_TYPES.has(node.type) || DATA_STORAGE_TYPES.has(node.type)
  ).length;
  const hasZeroTrustControl = nodes.some(
    (node) =>
      node.type === 'SERVICE_MESH' ||
      node.type === 'POLICY_ENGINE' ||
      node.type === 'ACCESS_CONTROL_SYSTEM'
  );
  if (internalServiceCount >= 4 && !hasZeroTrustControl) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.SECURITY,
        message: 'Internal services are present without explicit zero-trust controls (Service Mesh / Policy / Access Control).',
        relatedNodeIds: nodes
          .filter((node) => COMPUTE_TYPES.has(node.type) || DATA_STORAGE_TYPES.has(node.type))
          .map((node) => node.id),
      })
    );
  }

  // E.1 + E.2 + E.3
  const criticalPathNodes = new Set();
  const queue = [...nodes.filter((node) => PUBLIC_ENTRY_TYPES.has(node.type)).map((node) => node.id)];
  const visited = new Set(queue);
  while (queue.length > 0) {
    const currentId = queue.shift();
    const outgoing = outgoingByNode.get(currentId) || [];
    outgoing.forEach((edge) => {
      if (visited.has(edge.target)) return;
      visited.add(edge.target);
      queue.push(edge.target);
      criticalPathNodes.add(edge.target);
    });
  }
  const singleComputeOnPath = nodes.filter(
    (node) => COMPUTE_TYPES.has(node.type) && criticalPathNodes.has(node.id)
  );
  if (singleComputeOnPath.length === 1) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.RELIABILITY,
        message: `${singleComputeOnPath[0].label || singleComputeOnPath[0].type} appears to be a single compute instance on a critical path.`,
        relatedNodeIds: [singleComputeOnPath[0].id],
      })
    );
  }

  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;
    if (ASYNC_BOUNDARY_TYPES.has(sourceNode.type) && COMPUTE_TYPES.has(targetNode.type)) {
      if (!hasMetadataKeyword(targetNode, ['idempotent', 'dedupe', 'exactly once', 'at least once'])) {
        insights.push(
          buildInsight({
            category: INSIGHT_CATEGORIES.RELIABILITY,
            message: `${targetNode.label || targetNode.type} consumes async work from ${
              sourceNode.label || sourceNode.type
            } but idempotency is not documented.`,
            relatedNodeIds: [sourceNode.id, targetNode.id],
            relatedEdgeIds: [edge.id],
          })
        );
      }
    }
  });

  const hasAsyncBoundary = nodes.some((node) => ASYNC_BOUNDARY_TYPES.has(node.type));
  if (hasPublicExposure && edges.length > 5 && !hasAsyncBoundary) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.RELIABILITY,
        message: 'No async boundary is modeled. Consider isolating failure domains with queue/event boundaries.',
      })
    );
  }

  // F.1 + F.2 + F.3
  const hasLogging = nodes.some((node) => node.type === 'LOGGING_SYSTEM');
  const hasMetrics = nodes.some((node) => node.type === 'METRICS_SYSTEM');
  const hasTracing = nodes.some((node) => node.type === 'TRACING_SYSTEM');
  const hasAlerting = nodes.some((node) => node.type === 'ALERTING_SYSTEM');

  if (nodes.some((node) => COMPUTE_TYPES.has(node.type)) && (!hasLogging || !hasMetrics)) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.OBSERVABILITY,
        message: 'Compute components should emit logs and metrics. Logging and Metrics systems are incomplete.',
        relatedNodeIds: nodes.filter((node) => COMPUTE_TYPES.has(node.type)).map((node) => node.id),
      })
    );
  }

  const crossServiceCallCount = edges.filter((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    return sourceNode && targetNode && sourceNode.id !== targetNode.id;
  }).length;
  if (crossServiceCallCount > 0 && !hasTracing) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.OBSERVABILITY,
        message: 'Cross-service calls exist but no Tracing System is modeled.',
      })
    );
  }

  if (hasPublicExposure && !hasAlerting) {
    insights.push(
      buildInsight({
        category: INSIGHT_CATEGORIES.OBSERVABILITY,
        message: 'Public-facing systems should include alerting mapped to user-visible impact.',
        relatedNodeIds: nodes.filter((node) => PUBLIC_ENTRY_TYPES.has(node.type)).map((node) => node.id),
      })
    );
  }

  // G.3: Insights are passive and never block design actions.
  const unique = new Map();
  insights.forEach((insight) => {
    unique.set(insight.id, insight);
  });
  return Array.from(unique.values());
};

const Canvas = () => {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  const { theme, toggleTheme } = useTheme();

  const canvasRef = useRef(null);
  const autosaveDebounceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const permissionNoticeTimeoutRef = useRef(null);
  const draggingNodeRef = useRef(null);
  const draggingBendRef = useRef(null);
  const draggingSegmentRef = useRef(null);
  const panningRef = useRef(null);
  const historyPastRef = useRef([]);
  const historyFutureRef = useRef([]);
  const previousCanvasRef = useRef(null);
  const isHistoryTraversalRef = useRef(false);
  const historyDragRef = useRef({ active: false, startState: null });
  const canvasStateRef = useRef(DEFAULT_CANVAS_STATE);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [system, setSystem] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [isPanning, setIsPanning] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState('');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_MAX_WIDTH : false
  );

  const [canvasState, setCanvasState] = useState(DEFAULT_CANVAS_STATE);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [connectionDraft, setConnectionDraft] = useState(null);
  const [showGlobalConnectors, setShowGlobalConnectors] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [rightPanelMode, setRightPanelMode] = useState('design');
  const [isRightPanelHidden, setIsRightPanelHidden] = useState(false);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState('components');
  const [expandedComponentCategories, setExpandedComponentCategories] = useState(() => new Set());
  const [historyVersion, setHistoryVersion] = useState(0);
  const [hoveredInsightId, setHoveredInsightId] = useState(null);
  const [activeInsightId, setActiveInsightId] = useState(null);
  const [comments, setComments] = useState([]);
  const [areCommentsLoading, setAreCommentsLoading] = useState(true);
  const [commentError, setCommentError] = useState('');
  const [newCommentBody, setNewCommentBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [activeReplyParentId, setActiveReplyParentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [componentSearch, setComponentSearch] = useState('');

  const lastSavedSignatureRef = useRef('');
  const retryAttemptRef = useRef(0);
  const currentUserCanvasRole = (system?.current_user_canvas_role || 'viewer').toLowerCase();
  const isWorkspaceMember = Boolean(workspace?.is_member);
  const canEditStructure = isWorkspaceMember && currentUserCanvasRole === 'editor';
  const canComment = isWorkspaceMember && (currentUserCanvasRole === 'editor' || currentUserCanvasRole === 'commenter');
  const isReadOnlyStructure = !canEditStructure;

  const showPermissionNotice = useCallback(() => {
    const roleLabel = currentUserCanvasRole === 'commenter' ? 'commenter' : 'viewer';
    setPermissionNotice(`You cannot select components in ${roleLabel} mode. Ask an editor for edit access.`);
    clearTimeout(permissionNoticeTimeoutRef.current);
    permissionNoticeTimeoutRef.current = setTimeout(() => {
      setPermissionNotice('');
    }, 2600);
  }, [currentUserCanvasRole]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= MOBILE_MAX_WIDTH);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [systemRes, workspaceRes, userRes] = await Promise.all([
          api.get(`workspaces/${workspaceId}/canvases/${systemId}/`),
          api.get(`workspaces/${workspaceId}/`),
          api.get('auth/profile/'),
        ]);

        const serverCanvasState = ensureCanvasState(
          systemRes.data.canvas_state || systemRes.data.canvas_data || DEFAULT_CANVAS_STATE
        );

        setSystem(systemRes.data);
        setWorkspace(workspaceRes.data);
        setUser(userRes.data);
        setCanvasState(serverCanvasState);
        previousCanvasRef.current = cloneCanvasState(serverCanvasState);
        historyPastRef.current = [];
        historyFutureRef.current = [];
        setHistoryVersion((value) => value + 1);
        lastSavedSignatureRef.current = JSON.stringify(serverCanvasState);
      } catch (error) {
        console.error('Failed to load canvas', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isMobileViewport, workspaceId, systemId]);

  const fetchComments = useCallback(async () => {
    setAreCommentsLoading(true);
    setCommentError('');
    try {
      const response = await api.get(`systems/${systemId}/comments/`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Failed to load comments', error);
      setCommentError('Failed to load comments.');
      setComments([]);
    } finally {
      setAreCommentsLoading(false);
    }
  }, [systemId]);

  useEffect(() => {
    if (isMobileViewport) return;
    fetchComments();
  }, [fetchComments, isMobileViewport]);

  const saveCanvasState = useCallback(
    async (nextState, signature) => {
      setSaveStatus('saving');
      try {
        await api.put(`systems/${systemId}/canvas/`, { canvasState: nextState });
        lastSavedSignatureRef.current = signature;
        retryAttemptRef.current = 0;
        setSaveStatus('saved');
      } catch {
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
    if (isMobileViewport || loading || !system || isReadOnlyStructure) return;

    const signature = JSON.stringify(canvasState);
    if (signature === lastSavedSignatureRef.current) return;

    clearTimeout(autosaveDebounceRef.current);
    autosaveDebounceRef.current = setTimeout(() => {
      saveCanvasState(canvasState, signature);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(autosaveDebounceRef.current);
    };
  }, [canvasState, isMobileViewport, isReadOnlyStructure, loading, saveCanvasState, system]);

  useEffect(() => {
    return () => {
      clearTimeout(autosaveDebounceRef.current);
      clearTimeout(retryTimeoutRef.current);
      clearTimeout(permissionNoticeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    canvasStateRef.current = canvasState;
  }, [canvasState]);

  const beginDragHistory = useCallback(() => {
    if (historyDragRef.current.active) return;
    historyDragRef.current = {
      active: true,
      startState: cloneCanvasState(canvasStateRef.current),
    };
  }, []);

  const commitDragHistory = useCallback(() => {
    if (!historyDragRef.current.active) return;
    const startState = historyDragRef.current.startState;
    historyDragRef.current = { active: false, startState: null };

    if (!startState) return;
    const currentState = cloneCanvasState(canvasStateRef.current);
    const startSignature = JSON.stringify(startState);
    const currentSignature = JSON.stringify(currentState);
    if (startSignature === currentSignature) {
      previousCanvasRef.current = currentState;
      return;
    }

    historyPastRef.current.push(startState);
    if (historyPastRef.current.length > 80) {
      historyPastRef.current.shift();
    }
    historyFutureRef.current = [];
    previousCanvasRef.current = currentState;
    setHistoryVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!previousCanvasRef.current) {
      previousCanvasRef.current = cloneCanvasState(canvasState);
      return;
    }

    if (historyDragRef.current.active) {
      return;
    }

    if (isHistoryTraversalRef.current) {
      isHistoryTraversalRef.current = false;
      previousCanvasRef.current = cloneCanvasState(canvasState);
      return;
    }

    const previousSignature = JSON.stringify(previousCanvasRef.current);
    const currentSignature = JSON.stringify(canvasState);
    if (previousSignature === currentSignature) return;

    historyPastRef.current.push(cloneCanvasState(previousCanvasRef.current));
    if (historyPastRef.current.length > 80) {
      historyPastRef.current.shift();
    }
    historyFutureRef.current = [];
    previousCanvasRef.current = cloneCanvasState(canvasState);
    setHistoryVersion((value) => value + 1);
  }, [canvasState, loading]);

  const updateViewport = useCallback((updater) => {
    setCanvasState((prev) => ({
      ...prev,
      viewport: typeof updater === 'function' ? updater(prev.viewport) : updater,
    }));
  }, []);

  const openPropertiesPanel = useCallback(() => {
    setIsRightPanelHidden(false);
  }, []);

  const handleDropComponent = (event) => {
    event.preventDefault();
    if (!canEditStructure) return;
    const rawComponentType = event.dataTransfer.getData('application/structra-component-type');
    const componentType = normalizeNodeType(rawComponentType);
    if (!componentType || !ALLOWED_COMPONENT_TYPES.has(componentType) || !canvasRef.current) return;

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
    if (!canEditStructure) {
      if (activeTool === 'select' && event.button === 0) {
        showPermissionNotice();
      }
      return;
    }
    if (activeTool !== 'select') return;
    if (event.button !== 0) return;
    setRightPanelMode('design');
    openPropertiesPanel();

    draggingNodeRef.current = {
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: node.position.x,
      startY: node.position.y,
    };

    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    beginDragHistory();
  };

  const onEdgeBendMouseDown = (event, edgeId, bendIndex) => {
    if (!canEditStructure) return;
    event.stopPropagation();
    if (event.button !== 0) return;
    setRightPanelMode('design');
    openPropertiesPanel();
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    draggingBendRef.current = { edgeId, bendIndex };
    setShowGlobalConnectors(true);
    beginDragHistory();
  };

  const onEdgeSegmentMouseDown = (event, edge, segmentIndex) => {
    if (!canEditStructure) return;
    event.stopPropagation();
    if (event.button !== 0) return;
    if (event.detail === 2) return;

    const { pathPoints } = getEdgeScreenPath(edge);
    const start = pathPoints[segmentIndex];
    const end = pathPoints[segmentIndex + 1];
    if (!start || !end) return;

    const orientation = start.x === end.x ? 'vertical' : 'horizontal';
    if (start.x !== end.x && start.y !== end.y) return;
    const lineCoordinate = orientation === 'vertical' ? start.x : start.y;
    let minSegmentIndex = segmentIndex;
    let maxSegmentIndex = segmentIndex;

    while (minSegmentIndex > 0) {
      const prevStart = pathPoints[minSegmentIndex - 1];
      const prevEnd = pathPoints[minSegmentIndex];
      if (!prevStart || !prevEnd) break;
      const matchesOrientation =
        orientation === 'vertical'
          ? prevStart.x === prevEnd.x
          : prevStart.y === prevEnd.y;
      const onSameLine =
        orientation === 'vertical' ? prevStart.x === lineCoordinate : prevStart.y === lineCoordinate;
      if (!matchesOrientation || !onSameLine) break;
      minSegmentIndex -= 1;
    }

    while (maxSegmentIndex < pathPoints.length - 2) {
      const nextStart = pathPoints[maxSegmentIndex + 1];
      const nextEnd = pathPoints[maxSegmentIndex + 2];
      if (!nextStart || !nextEnd) break;
      const matchesOrientation =
        orientation === 'vertical'
          ? nextStart.x === nextEnd.x
          : nextStart.y === nextEnd.y;
      const onSameLine =
        orientation === 'vertical' ? nextStart.x === lineCoordinate : nextStart.y === lineCoordinate;
      if (!matchesOrientation || !onSameLine) break;
      maxSegmentIndex += 1;
    }

    if (minSegmentIndex <= 0 || maxSegmentIndex >= pathPoints.length - 2) return;

    const bendIndicesToMove = [];
    for (
      let pointIndex = minSegmentIndex;
      pointIndex <= maxSegmentIndex + 1;
      pointIndex += 1
    ) {
      if (pointIndex > 0 && pointIndex < pathPoints.length - 1) {
        bendIndicesToMove.push(pointIndex - 1);
      }
    }
    if (bendIndicesToMove.length === 0) return;

    const materializedBends = pathPoints
      .slice(1, -1)
      .map((point) => canvasToWorld(point.x, point.y, canvasState.viewport));

    setRightPanelMode('design');
    openPropertiesPanel();
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);

    draggingSegmentRef.current = {
      edgeId: edge.id,
      segmentIndex,
      orientation,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialBends: materializedBends,
      bendIndicesToMove,
    };
    setShowGlobalConnectors(true);
    beginDragHistory();
  };

  const addEdgeBendAtSegment = (event, edge, segmentIndex) => {
    if (!canEditStructure) return;
    event.stopPropagation();
    const { sourceNode, targetNode, pathPoints, segmentToRawIndex } = getEdgeScreenPath(edge);
    if (!sourceNode || !targetNode) return;
    if (!pathPoints[segmentIndex] || !pathPoints[segmentIndex + 1] || !canvasRef.current) return;

    const midX = (pathPoints[segmentIndex].x + pathPoints[segmentIndex + 1].x) / 2;
    const midY = (pathPoints[segmentIndex].y + pathPoints[segmentIndex + 1].y) / 2;
    const worldPoint = canvasToWorld(midX, midY, canvasState.viewport);
    const insertAt = Math.max(0, segmentToRawIndex[segmentIndex] ?? segmentIndex);

    setCanvasState((prev) => ({
      ...prev,
      edges: prev.edges.map((item) => {
        if (item.id !== edge.id) return item;
        const nextBends = Array.isArray(item.bends) ? [...item.bends] : [];
        nextBends.splice(insertAt, 0, worldPoint);
        return {
          ...item,
          bends: nextBends,
        };
      }),
    }));

    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    openPropertiesPanel();
    setRightPanelMode('design');

    draggingBendRef.current = { edgeId: edge.id, bendIndex: insertAt };
    setShowGlobalConnectors(true);
  };

  const removeEdgeBend = (event, edgeId, bendIndex) => {
    if (!canEditStructure) return;
    event.stopPropagation();
    setCanvasState((prev) => ({
      ...prev,
      edges: prev.edges.map((edge) => {
        if (edge.id !== edgeId) return edge;
        const nextBends = Array.isArray(edge.bends) ? edge.bends : [];
        return {
          ...edge,
          bends: nextBends.filter((_, index) => index !== bendIndex),
        };
      }),
    }));
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
    setIsPanning(true);
    beginDragHistory();
  };

  useEffect(() => {
    const onMouseMove = (event) => {
      if (draggingSegmentRef.current) {
        const drag = draggingSegmentRef.current;
        const deltaX = (event.clientX - drag.startClientX) / canvasState.viewport.zoom;
        const deltaY = (event.clientY - drag.startClientY) / canvasState.viewport.zoom;

        setCanvasState((prev) => ({
          ...prev,
          edges: prev.edges.map((edge) => {
            if (edge.id !== drag.edgeId) return edge;
            const nextBends = Array.isArray(drag.initialBends) ? [...drag.initialBends] : [];

            const applyDelta = (index) => {
              if (!nextBends[index]) return;
              if (drag.orientation === 'vertical') {
                nextBends[index] = { ...nextBends[index], x: nextBends[index].x + deltaX };
              } else {
                nextBends[index] = { ...nextBends[index], y: nextBends[index].y + deltaY };
              }
            };

            drag.bendIndicesToMove.forEach(applyDelta);
            return { ...edge, bends: nextBends };
          }),
        }));
      }

      if (draggingBendRef.current && canvasRef.current) {
        const drag = draggingBendRef.current;
        const rect = canvasRef.current.getBoundingClientRect();
        const world = canvasToWorld(
          event.clientX - rect.left,
          event.clientY - rect.top,
          canvasState.viewport
        );

        setCanvasState((prev) => ({
          ...prev,
          edges: prev.edges.map((edge) => {
            if (edge.id !== drag.edgeId) return edge;
            const nextBends = Array.isArray(edge.bends) ? [...edge.bends] : [];
            if (!nextBends[drag.bendIndex]) return edge;
            nextBends[drag.bendIndex] = world;
            return { ...edge, bends: nextBends };
          }),
        }));
      }

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
      draggingBendRef.current = null;
      draggingSegmentRef.current = null;
      panningRef.current = null;
      setIsPanning(false);
      setShowGlobalConnectors(false);
      commitDragHistory();
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
  }, [canvasState.viewport, commitDragHistory, connectionDraft, updateViewport]);

  const startConnection = (event, nodeId) => {
    if (!canEditStructure) return;
    event.stopPropagation();
    setRightPanelMode('design');
    openPropertiesPanel();
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setShowGlobalConnectors(true);
    setConnectionDraft({
      sourceId: nodeId,
      sourceAnchor: resolveAnchor(event.currentTarget?.dataset?.anchor, 'right'),
      pointer: { x: event.clientX, y: event.clientY },
    });
  };

  const completeConnection = (event, targetNodeId, targetAnchor) => {
    if (!canEditStructure) return;
    event.stopPropagation();
    if (!connectionDraft) return;

    const source = connectionDraft.sourceId;
    const target = targetNodeId;
    const sourceAnchor = resolveAnchor(connectionDraft.sourceAnchor, 'right');
    const nextTargetAnchor = resolveAnchor(targetAnchor, 'left');
    if (source === target) {
      setConnectionDraft(null);
      setShowGlobalConnectors(false);
      return;
    }

    const duplicate = canvasState.edges.some(
      (edge) => edge.source === source && edge.target === target
    );

    if (!duplicate) {
      const nextEdge = {
        id: makeUuid(),
        source,
        target,
        sourceAnchor,
        targetAnchor: nextTargetAnchor,
        bends: [],
        metadata: { protocol: '', notes: '' },
      };
      setCanvasState((prev) => ({ ...prev, edges: [...prev.edges, nextEdge] }));
      setSelectedEdgeId(nextEdge.id);
      setSelectedNodeId(null);
      setRightPanelMode('design');
      openPropertiesPanel();
    }

    setConnectionDraft(null);
    setShowGlobalConnectors(false);
  };

  const selectedNode = useMemo(
    () => canvasState.nodes.find((node) => node.id === selectedNodeId) || null,
    [canvasState.nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => canvasState.edges.find((edge) => edge.id === selectedEdgeId) || null,
    [canvasState.edges, selectedEdgeId]
  );
  const insights = useMemo(() => computeInsights(canvasState), [canvasState]);
  const insightsById = useMemo(
    () => new Map(insights.map((insight) => [insight.id, insight])),
    [insights]
  );
  const highlightedInsight = insightsById.get(hoveredInsightId) || insightsById.get(activeInsightId) || null;
  const highlightedNodeIds = useMemo(
    () => new Set(highlightedInsight?.relatedNodeIds || []),
    [highlightedInsight]
  );
  const highlightedEdgeIds = useMemo(
    () => new Set(highlightedInsight?.relatedEdgeIds || []),
    [highlightedInsight]
  );
  const insightsByCategory = useMemo(
    () =>
      Object.values(INSIGHT_CATEGORIES).map((category) => ({
        category,
        items: insights.filter((insight) => insight.category === category),
      })),
    [insights]
  );

  useEffect(() => {
    if (activeInsightId && !insightsById.has(activeInsightId)) {
      setActiveInsightId(null);
    }
    if (hoveredInsightId && !insightsById.has(hoveredInsightId)) {
      setHoveredInsightId(null);
    }
  }, [activeInsightId, hoveredInsightId, insightsById]);

  const setNodeLabel = (label) => {
    if (!canEditStructure) return;
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

  const setNodeMetadataField = (field, value) => {
    if (!canEditStructure) return;
    if (!selectedNodeId) return;
    setCanvasState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              metadata: {
                ...node.metadata,
                [field]: value,
              },
            }
          : node
      ),
    }));
  };

  const addNodeResponsibility = () => {
    if (!canEditStructure) return;
    if (!selectedNodeId) return;
    setCanvasState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const current = Array.isArray(node.metadata?.responsibilities) ? node.metadata.responsibilities : [];
        return {
          ...node,
          metadata: {
            ...node.metadata,
            responsibilities: [...current, ''],
          },
        };
      }),
    }));
  };

  const updateNodeResponsibility = (index, value) => {
    if (!canEditStructure) return;
    if (!selectedNodeId) return;
    setCanvasState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const current = Array.isArray(node.metadata?.responsibilities) ? node.metadata.responsibilities : [];
        return {
          ...node,
          metadata: {
            ...node.metadata,
            responsibilities: current.map((item, itemIndex) => (itemIndex === index ? value : item)),
          },
        };
      }),
    }));
  };

  const removeNodeResponsibility = (index) => {
    if (!canEditStructure) return;
    if (!selectedNodeId) return;
    setCanvasState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const current = Array.isArray(node.metadata?.responsibilities) ? node.metadata.responsibilities : [];
        return {
          ...node,
          metadata: {
            ...node.metadata,
            responsibilities: current.filter((_, itemIndex) => itemIndex !== index),
          },
        };
      }),
    }));
  };

  const setEdgeMetadataField = (field, value) => {
    if (!canEditStructure) return;
    if (!selectedEdgeId) return;
    setCanvasState((prev) => ({
      ...prev,
      edges: prev.edges.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              metadata: {
                ...edge.metadata,
                [field]: value,
              },
            }
          : edge
      ),
    }));
  };

  const setSystemMetadataField = (field, value) => {
    if (!canEditStructure) return;
    setCanvasState((prev) => ({
      ...prev,
      systemMetadata: {
        ...(prev.systemMetadata || {}),
        [field]: value,
      },
    }));
  };

  const addSystemAssumption = () => {
    if (!canEditStructure) return;
    setCanvasState((prev) => {
      const assumptions = Array.isArray(prev?.systemMetadata?.assumptions)
        ? prev.systemMetadata.assumptions
        : [];
      return {
        ...prev,
        systemMetadata: {
          ...(prev.systemMetadata || {}),
          assumptions: [...assumptions, ''],
        },
      };
    });
  };

  const updateSystemAssumption = (index, value) => {
    if (!canEditStructure) return;
    setCanvasState((prev) => {
      const assumptions = Array.isArray(prev?.systemMetadata?.assumptions)
        ? prev.systemMetadata.assumptions
        : [];
      return {
        ...prev,
        systemMetadata: {
          ...(prev.systemMetadata || {}),
          assumptions: assumptions.map((item, itemIndex) => (itemIndex === index ? value : item)),
        },
      };
    });
  };

  const removeSystemAssumption = (index) => {
    if (!canEditStructure) return;
    setCanvasState((prev) => {
      const assumptions = Array.isArray(prev?.systemMetadata?.assumptions)
        ? prev.systemMetadata.assumptions
        : [];
      return {
        ...prev,
        systemMetadata: {
          ...(prev.systemMetadata || {}),
          assumptions: assumptions.filter((_, itemIndex) => itemIndex !== index),
        },
      };
    });
  };

  const focusInsight = (insight) => {
    if (!insight) return;
    setActiveInsightId(insight.id);
    setRightPanelMode('design');
    openPropertiesPanel();

    const relatedNodeIds = Array.isArray(insight.relatedNodeIds) ? insight.relatedNodeIds : [];
    const relatedEdgeIds = Array.isArray(insight.relatedEdgeIds) ? insight.relatedEdgeIds : [];

    if (relatedNodeIds.length > 0) {
      setSelectedNodeId(relatedNodeIds[0]);
      setSelectedEdgeId(null);
    } else if (relatedEdgeIds.length > 0) {
      setSelectedEdgeId(relatedEdgeIds[0]);
      setSelectedNodeId(null);
    }

    const relatedNodes = new Map();
    canvasState.nodes.forEach((node) => {
      if (relatedNodeIds.includes(node.id)) {
        relatedNodes.set(node.id, node);
      }
    });

    if (relatedNodes.size === 0 && relatedEdgeIds.length > 0) {
      canvasState.edges.forEach((edge) => {
        if (!relatedEdgeIds.includes(edge.id)) return;
        const sourceNode = canvasState.nodes.find((node) => node.id === edge.source);
        const targetNode = canvasState.nodes.find((node) => node.id === edge.target);
        if (sourceNode) relatedNodes.set(sourceNode.id, sourceNode);
        if (targetNode) relatedNodes.set(targetNode.id, targetNode);
      });
    }

    if (relatedNodes.size === 0 || !canvasRef.current) return;

    const nodesToFocus = Array.from(relatedNodes.values());
    const minX = Math.min(...nodesToFocus.map((node) => node.position.x));
    const minY = Math.min(...nodesToFocus.map((node) => node.position.y));
    const maxX = Math.max(...nodesToFocus.map((node) => node.position.x + NODE_WIDTH));
    const maxY = Math.max(...nodesToFocus.map((node) => node.position.y + NODE_HEIGHT));

    const rect = canvasRef.current.getBoundingClientRect();
    const padding = 80;
    const fitWidth = Math.max(120, maxX - minX + padding * 2);
    const fitHeight = Math.max(120, maxY - minY + padding * 2);
    const zoomX = rect.width / fitWidth;
    const zoomY = rect.height / fitHeight;
    const nextZoom = Math.max(0.4, Math.min(2.5, Math.min(zoomX, zoomY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const nextPanX = rect.width / 2 - centerX * nextZoom;
    const nextPanY = rect.height / 2 - centerY * nextZoom;

    setCanvasState((prev) => ({
      ...prev,
      viewport: {
        zoom: +nextZoom.toFixed(2),
        pan: {
          x: Math.round(nextPanX),
          y: Math.round(nextPanY),
        },
      },
    }));
  };

  const deleteSelectedEdge = useCallback(() => {
    if (!canEditStructure) return;
    if (!selectedEdgeId) return;
    setCanvasState((prev) => ({
      ...prev,
      edges: prev.edges.filter((edge) => edge.id !== selectedEdgeId),
    }));
    setSelectedEdgeId(null);
  }, [canEditStructure, selectedEdgeId]);

  const deleteSelectedNode = useCallback(() => {
    if (!canEditStructure) return;
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
  }, [canEditStructure, selectedNodeId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!canEditStructure) return;
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      if (isEditableElement(event.target)) return;
      if (!selectedEdgeId && !selectedNodeId) return;
      event.preventDefault();
      if (selectedEdgeId) {
        deleteSelectedEdge();
        return;
      }
      deleteSelectedNode();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEditStructure, selectedEdgeId, selectedNodeId, deleteSelectedEdge, deleteSelectedNode]);

  const undoCanvasChange = useCallback(() => {
    if (!canEditStructure) return;
    if (historyPastRef.current.length === 0) return;
    const previous = historyPastRef.current.pop();
    if (!previous) return;
    historyFutureRef.current.push(cloneCanvasState(canvasState));
    isHistoryTraversalRef.current = true;
    setCanvasState(cloneCanvasState(previous));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setHistoryVersion((value) => value + 1);
  }, [canEditStructure, canvasState]);

  const redoCanvasChange = useCallback(() => {
    if (!canEditStructure) return;
    if (historyFutureRef.current.length === 0) return;
    const next = historyFutureRef.current.pop();
    if (!next) return;
    historyPastRef.current.push(cloneCanvasState(canvasState));
    isHistoryTraversalRef.current = true;
    setCanvasState(cloneCanvasState(next));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setHistoryVersion((value) => value + 1);
  }, [canEditStructure, canvasState]);

  const canUndo = historyPastRef.current.length > 0;
  const canRedo = historyFutureRef.current.length > 0;
  const handleCreateComment = useCallback(async () => {
    if (!canComment) return;
    const body = newCommentBody.trim();
    if (!body) return;
    try {
      await api.post(`systems/${systemId}/comments/`, { body });
      setNewCommentBody('');
      await fetchComments();
    } catch (error) {
      console.error('Failed to create comment', error);
    }
  }, [canComment, fetchComments, newCommentBody, systemId]);

  const handleCreateReply = useCallback(
    async (parentId) => {
      if (!canComment) return;
      const body = (replyDrafts[parentId] || '').trim();
      if (!body) return;
      try {
        await api.post(`systems/${systemId}/comments/`, { body, parent: parentId });
        setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
        setActiveReplyParentId(null);
        await fetchComments();
      } catch (error) {
        console.error('Failed to create reply', error);
      }
    },
    [canComment, fetchComments, replyDrafts, systemId]
  );

  const handleSaveCommentEdit = useCallback(async () => {
    if (!editingCommentId) return;
    const body = editingCommentBody.trim();
    if (!body) return;
    try {
      await api.patch(`systems/${systemId}/comments/${editingCommentId}/`, { body });
      setEditingCommentId(null);
      setEditingCommentBody('');
      await fetchComments();
    } catch (error) {
      console.error('Failed to edit comment', error);
    }
  }, [editingCommentBody, editingCommentId, fetchComments, systemId]);

  const handleDeleteComment = useCallback(
    async (commentId) => {
      try {
        await api.delete(`systems/${systemId}/comments/${commentId}/`);
        await fetchComments();
      } catch (error) {
        console.error('Failed to delete comment', error);
      }
    },
    [fetchComments, systemId]
  );

  const toggleComponentCategory = useCallback((categoryKey) => {
    setExpandedComponentCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  }, []);

  const zoomPercent = Math.round(canvasState.viewport.zoom * 100);

  const getNodeScreenAnchor = (node, anchor) => {
    const resolvedAnchor = resolveAnchor(anchor, 'right');
    const offset = ANCHOR_OFFSETS[resolvedAnchor];
    const worldX = node.position.x + offset.x;
    const worldY = node.position.y + offset.y;
    return worldToScreen(worldX, worldY, canvasState.viewport);
  };

  const getEdgeScreenPath = (edge) => {
    const sourceNode = canvasState.nodes.find((node) => node.id === edge.source);
    const targetNode = canvasState.nodes.find((node) => node.id === edge.target);
    if (!sourceNode || !targetNode) {
      return { sourceNode: null, targetNode: null, pathPoints: [], segmentToRawIndex: [] };
    }

    const sourceAnchor = resolveAnchor(edge.sourceAnchor, 'right');
    const targetAnchor = resolveAnchor(edge.targetAnchor, 'left');
    const sourcePoint = getNodeScreenAnchor(sourceNode, sourceAnchor);
    const targetPoint = getNodeScreenAnchor(targetNode, targetAnchor);
    const bendPoints = Array.isArray(edge.bends)
      ? edge.bends.map((bend) => worldToScreen(bend.x, bend.y, canvasState.viewport))
      : [];

    if (bendPoints.length > 0) {
      const rawPathPoints = [sourcePoint, ...bendPoints, targetPoint];
      const orthogonal = buildOrthogonalPath(rawPathPoints);
      return {
        sourceNode,
        targetNode,
        pathPoints: collapseDuplicatePoints(orthogonal.points),
        segmentToRawIndex: orthogonal.segmentToRawIndex,
      };
    }

    const sourceDirection = ANCHOR_DIRECTIONS[sourceAnchor];
    const targetDirection = ANCHOR_DIRECTIONS[targetAnchor];
    const sourceLead = {
      x: sourcePoint.x + sourceDirection.x * DEFAULT_EDGE_BREAKOUT,
      y: sourcePoint.y + sourceDirection.y * DEFAULT_EDGE_BREAKOUT,
    };
    const targetLead = {
      x: targetPoint.x + targetDirection.x * DEFAULT_EDGE_BREAKOUT,
      y: targetPoint.y + targetDirection.y * DEFAULT_EDGE_BREAKOUT,
    };
    const betweenLeadRaw =
      Math.abs(sourceDirection.y) === 1
        ? [sourceLead, { x: sourceLead.x, y: targetLead.y }, targetLead]
        : [sourceLead, { x: targetLead.x, y: sourceLead.y }, targetLead];
    const orthogonal = buildOrthogonalPath([sourcePoint, ...betweenLeadRaw, targetPoint]);
    return {
      sourceNode,
      targetNode,
      pathPoints: collapseDuplicatePoints(orthogonal.points),
      segmentToRawIndex: orthogonal.segmentToRawIndex,
    };
  };

  const saveLabel =
    isReadOnlyStructure
      ? currentUserCanvasRole === 'commenter'
        ? 'Comment mode'
        : 'Read only'
      : saveStatus === 'saving'
      ? 'Saving...'
      : saveStatus === 'retrying'
      ? 'Saving...'
      : 'Saved';
  const isDarkTheme = theme === 'dark';
  const canvasGridDotColor = isDarkTheme ? '#334766' : '#c8ccd4';
  const canvasGridBackground = isDarkTheme ? '#0b1220' : '#f8f9fb';
  const edgeDefaultColor = isDarkTheme ? '#93a8c7' : '#94a3b8';
  const edgeSelectedColor = isDarkTheme ? '#60a5fa' : '#3b82f6';
  const edgeHighlightColor = isDarkTheme ? '#34d399' : '#10b981';
  const nodeZoom = canvasState.viewport.zoom;
  const nodePadding = Math.max(6, Math.round(12 * nodeZoom));
  const nodeTypeFontSize = Math.max(8, Math.round(12 * nodeZoom));
  const nodeLabelFontSize = Math.max(10, Math.round(16 * nodeZoom));
  const nodeIdFontSize = Math.max(8, Math.round(12 * nodeZoom));
  const nodeIconSize = Math.max(10, Math.round(14 * nodeZoom));

  if (loading) {
    return <LoadingState message="Loading canvas" minHeight="100vh" />;
  }

  if (isMobileViewport) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center p-6">
        <p className="text-sm font-medium text-gray-700 text-center">
          Mobile is not supported for the system canvas.
        </p>
      </div>
    );
  }

  if (!workspace || !system || !user) {
    return <div className="h-screen flex items-center justify-center text-red-600">Failed to load canvas.</div>;
  }

  const creatorName = user.full_name || user.email;
  const formatCommentTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  // Max depth before we stop indenting further and show an expand hint
  const COMMENT_DEPTH_LIMIT = 3;

  const renderCommentNode = (comment, depth = 0) => {
    // Once we hit the depth limit we still render, but no further left-indent is added.
    // Instead, a subtle banner asks the user to expand the panel for deep threads.
    const isCapped = depth >= COMMENT_DEPTH_LIMIT;

    return (
      <div key={comment.id} className="space-y-2 min-w-0 w-full overflow-hidden">
        {/* Depth-capped hint – shown once at the boundary depth */}
        {isCapped && depth === COMMENT_DEPTH_LIMIT && (
          <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1 truncate">
            <ChevronLeft size={11} className="shrink-0" />
            Deep thread — expand the panel for a better view.
          </p>
        )}

        <div className="flex items-start gap-2 min-w-0 overflow-hidden">
          <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            {(comment.author_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0 overflow-hidden">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {comment.author_name || 'Unknown'}
              </span>
              <span className="shrink-0">{formatCommentTimestamp(comment.created_at)}</span>
            </div>

            {editingCommentId === comment.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editingCommentBody}
                  onChange={(event) => setEditingCommentBody(event.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCommentEdit}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingCommentBody('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-gray-800 whitespace-pre-wrap leading-6 break-words overflow-hidden">
                {comment.body}
              </p>
            )}

            <div className="mt-2 flex items-center gap-4 text-xs">
              {canComment && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveReplyParentId((prev) => (prev === comment.id ? null : comment.id))
                  }
                  className="font-semibold text-gray-600 hover:text-gray-900"
                >
                  Reply
                </button>
              )}
              {(comment.is_author || workspace.is_admin) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingCommentBody(comment.body || '');
                    }}
                    className="font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="font-semibold text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>

            {canComment && activeReplyParentId === comment.id && (
              <div className="mt-3 space-y-2 overflow-hidden">
                <textarea
                  value={replyDrafts[comment.id] || ''}
                  onChange={(event) =>
                    setReplyDrafts((prev) => ({ ...prev, [comment.id]: event.target.value }))
                  }
                  rows={2}
                  placeholder="Add a reply..."
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateReply(comment.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReplyParentId(null)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <div
            className="space-y-2 overflow-hidden"
            style={!isCapped ? { borderLeft: '2px solid #e5e7eb', paddingLeft: '10px', marginLeft: '14px' } : { borderLeft: '2px solid #e5e7eb', paddingLeft: '8px', marginLeft: '8px' }}
          >
            {comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="canvas-page h-screen flex flex-col bg-white overflow-hidden">
      {permissionNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] w-[min(92vw,620px)] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 shadow">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-medium leading-5">{permissionNotice}</p>
          </div>
        </div>
      )}
      <header className="canvas-topbar border-b border-gray-200 bg-white px-4 py-0 flex items-stretch justify-between gap-3 h-12 shrink-0">
        {/* Left: breadcrumb */}
        <div className="flex items-center min-w-0 gap-1">
          <button
            type="button"
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-xs font-medium py-1 px-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Back to workspace"
          >
            <ChevronLeft size={13} />
            <span className="hidden sm:inline">{workspace.name}</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[220px]" title={system.name}>
            {system.name}
          </span>
          {isReadOnlyStructure && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded border border-amber-200 bg-amber-50 text-amber-700 uppercase tracking-wide">
              {currentUserCanvasRole === 'commenter' ? 'Commenter' : 'View Only'}
            </span>
          )}
        </div>

        {/* Center: tools */}
        <div className="flex items-center gap-1">
          {/* Tool toggle group */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTool === 'select'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTool('select')}
              type="button"
              title="Select (V)"
            >
              <MousePointer2 size={13} />
              <span>Select</span>
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTool === 'pan'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTool('pan')}
              type="button"
              title="Pan (H)"
            >
              <Hand size={13} />
              <span>Pan</span>
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          {/* Zoom controls */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() =>
                updateViewport((prev) => ({
                  ...prev,
                  zoom: Math.max(0.4, +(prev.zoom - 0.1).toFixed(2)),
                }))
              }
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-white transition-all"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-xs font-medium text-gray-700 min-w-[42px] text-center tabular-nums">{zoomPercent}%</span>
            <button
              type="button"
              onClick={() =>
                updateViewport((prev) => ({
                  ...prev,
                  zoom: Math.min(2.5, +(prev.zoom + 0.1).toFixed(2)),
                }))
              }
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-white transition-all"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        {/* Right: AI Evaluation + save indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm"
            title="AI Evaluation — coming soon"
          >
            <Sparkles size={13} />
            AI Evaluation
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            type="button"
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {canEditStructure && (
          <aside
            className={`canvas-components-panel border-r border-gray-200 bg-white flex flex-col transition-all duration-300 ${
              isLeftPanelCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64'
            }`}
          >
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 shrink-0">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              {leftPanelMode === 'components' ? 'Components' : leftPanelMode === 'text' ? 'Text' : 'Bounds'}
            </span>
            <button
              type="button"
              onClick={() => setIsLeftPanelCollapsed(true)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Hide left panel"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {leftPanelMode === 'components' ? (
            <>
          {/* Search bar */}
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                placeholder="Search components…"
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              />
              {componentSearch && (
                <button
                  type="button"
                  onClick={() => setComponentSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Component list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {componentSearch.trim() ? (
              /* Flat search results */
              (() => {
                const q = componentSearch.toLowerCase();
                const results = COMPONENT_CATEGORIES.flatMap((cat) =>
                  cat.components
                    .filter((c) => c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q))
                    .map((c) => ({ ...c, catIcon: cat.icon, catLabel: cat.label }))
                );
                if (results.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No components match "<span className="font-medium text-gray-600">{componentSearch}</span>"
                    </div>
                  );
                }
                return results.map((component) => {
                  const Icon = component.catIcon;
                  return (
                    <div
                      key={component.type}
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData('application/structra-component-type', component.type)
                      }
                      className="flex items-start gap-2.5 w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                      title={component.description}
                    >
                      <div className="w-6 h-6 rounded-md bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                        <Icon size={12} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-4">{component.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-3.5 truncate">{component.catLabel}</p>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              /* Categorized view */
              COMPONENT_CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                const isExpanded = expandedComponentCategories.has(category.key);
                return (
                  <div key={category.key}>
                    <button
                      type="button"
                      onClick={() => toggleComponentCategory(category.key)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 group-hover:text-gray-900">
                        <span className="w-5 h-5 rounded bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                          <CategoryIcon size={11} className="text-gray-500" />
                        </span>
                        {category.label}
                      </span>
                      <ChevronRight
                        size={12}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="mt-1 ml-2 pl-2 border-l-2 border-gray-100 space-y-1 pb-1">
                        {category.components.map((component) => (
                          <div
                            key={component.type}
                            draggable
                            onDragStart={(event) =>
                              event.dataTransfer.setData('application/structra-component-type', component.type)
                            }
                            className="flex items-start gap-2 w-full px-2.5 py-2 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50/60 cursor-grab active:cursor-grabbing transition-all group"
                            title={component.description}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 leading-4">{component.label}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-3.5">{component.description}</p>
                            </div>
                            <ArrowRight size={10} className="text-gray-300 group-hover:text-blue-400 mt-1 shrink-0 transition-colors" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 px-3 py-2 space-y-1.5 shrink-0">
            <button
              type="button"
              disabled={!selectedNodeId}
              onClick={deleteSelectedNode}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-all"
            >
              <Trash2 size={12} />
              Delete Selected Node
            </button>
            <button
              type="button"
              disabled={!selectedEdgeId}
              onClick={deleteSelectedEdge}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-all"
            >
              <Trash2 size={12} />
              Delete Selected Edge
            </button>
          </div>
            </>
          ) : (
            <div className="flex-1 p-3">
              <div className="h-full rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-3 py-4">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  {leftPanelMode === 'text' ? 'Text tools' : 'Bounds tools'}
                </p>
                <p className="text-xs text-gray-500">
                  This panel is ready. Editing tools for {leftPanelMode} will be added next.
                </p>
              </div>
            </div>
          )}
          </aside>
        )}

        {canEditStructure && isLeftPanelCollapsed && (
          <aside className="canvas-left-quickbar absolute top-3 left-3 z-20 inline-flex flex-col gap-1 p-1.5 rounded-xl border border-gray-200 bg-white shadow-sm">
            {LEFT_PANEL_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isActive = leftPanelMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLeftPanelMode(item.id);
                    setIsLeftPanelCollapsed(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={`Open ${item.label} panel`}
                >
                  <ItemIcon size={13} />
                  {item.label}
                </button>
              );
            })}
          </aside>
        )}

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
              setRightPanelMode('design');
              openPropertiesPanel();
            }}
            className={`relative flex-1 overflow-hidden ${
              isPanning ? 'cursor-grabbing' : activeTool === 'pan' ? 'cursor-grab' : 'cursor-default'
            }`}
            style={{
              backgroundColor: canvasGridBackground,
              backgroundImage: `radial-gradient(circle, ${canvasGridDotColor} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          >
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={edgeDefaultColor} />
                </marker>
                <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={edgeSelectedColor} />
                </marker>
                <marker id="arrowhead-highlighted" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={edgeHighlightColor} />
                </marker>
              </defs>
              {canvasState.edges.map((edge) => {
                const { sourceNode, targetNode, pathPoints } = getEdgeScreenPath(edge);
                if (!sourceNode || !targetNode || pathPoints.length < 2) return null;
                const edgeIsHighlighted = highlightedEdgeIds.has(edge.id);
                const pathDefinition = pathPoints.reduce(
                  (acc, point, index) =>
                    index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`,
                  ''
                );
                const edgeOpacity =
                  edgeIsHighlighted || selectedEdgeId === edge.id || !highlightedInsight ? 1 : 0.3;
                const isSelected = selectedEdgeId === edge.id;
                const edgeStrokeWidth = isSelected ? 2.5 : edgeIsHighlighted ? 2 : 1.5;
                const edgeColor = isSelected ? edgeSelectedColor : edgeIsHighlighted ? edgeHighlightColor : edgeDefaultColor;
                const arrowMarkerId = isSelected ? 'arrowhead-selected' : edgeIsHighlighted ? 'arrowhead-highlighted' : 'arrowhead';

                return (
                  <g key={edge.id}>
                    {/* Shadow/glow for selected */}
                    {isSelected && (
                      <path
                        d={pathDefinition}
                        stroke={edgeSelectedColor}
                        strokeWidth={6}
                        opacity={0.15}
                        fill="none"
                      />
                    )}
                    <path
                      d={pathDefinition}
                      stroke={edgeColor}
                      strokeWidth={edgeStrokeWidth}
                      opacity={edgeOpacity}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      markerEnd={`url(#${arrowMarkerId})`}
                    />
                    {/* Protocol label on selected edges */}
                    {isSelected && edge.metadata?.protocol && (() => {
                      const midIdx = Math.floor(pathPoints.length / 2);
                      const p1 = pathPoints[midIdx - 1] || pathPoints[0];
                      const p2 = pathPoints[midIdx] || pathPoints[pathPoints.length - 1];
                      const mx = (p1.x + p2.x) / 2;
                      const my = (p1.y + p2.y) / 2;
                      return (
                        <g>
                          <rect x={mx - 20} y={my - 9} width={40} height={18} rx={4} fill="#3b82f6" />
                          <text x={mx} y={my + 4.5} textAnchor="middle" fill="white" fontSize={9} fontWeight="600" fontFamily="ui-monospace, monospace">
                            {edge.metadata.protocol}
                          </text>
                        </g>
                      );
                    })()}
                    <path
                      d={pathDefinition}
                      stroke="transparent"
                      strokeWidth="14"
                      fill="none"
                      className="pointer-events-auto cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!canEditStructure) {
                          showPermissionNotice();
                          return;
                        }
                        setRightPanelMode('design');
                        openPropertiesPanel();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    {canEditStructure &&
                      selectedEdgeId === edge.id &&
                      (Array.isArray(edge.bends) ? edge.bends : []).map((bendPoint, bendIndex) => {
                        const screenPoint = worldToScreen(
                          bendPoint.x,
                          bendPoint.y,
                          canvasState.viewport
                        );
                        return (
                        <circle
                          key={`${edge.id}-bend-${bendIndex}`}
                          cx={screenPoint.x}
                          cy={screenPoint.y}
                          r={5}
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          className="pointer-events-auto cursor-move"
                          onMouseDown={(event) => onEdgeBendMouseDown(event, edge.id, bendIndex)}
                          onDoubleClick={(event) => removeEdgeBend(event, edge.id, bendIndex)}
                        />
                        );
                      })}
                    {canEditStructure &&
                      selectedEdgeId === edge.id &&
                      pathPoints.slice(0, -1).map((point, index) => {
                        if (index <= 0 || index >= pathPoints.length - 2) return null;
                        const nextPoint = pathPoints[index + 1];
                        const midX = (point.x + nextPoint.x) / 2;
                        const midY = (point.y + nextPoint.y) / 2;
                        const cursorClass = point.x === nextPoint.x ? 'cursor-ew-resize' : 'cursor-ns-resize';
                        return (
                          <circle
                            key={`${edge.id}-segment-${index}`}
                            cx={midX}
                            cy={midY}
                            r={4}
                            fill="#dbeafe"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            className={`pointer-events-auto ${cursorClass}`}
                            onMouseDown={(event) => onEdgeSegmentMouseDown(event, edge, index)}
                            onDoubleClick={(event) => addEdgeBendAtSegment(event, edge, index)}
                          />
                        );
                      })}
                  </g>
                );
              })}

              {connectionDraft && (() => {
                const sourceNode = canvasState.nodes.find((node) => node.id === connectionDraft.sourceId);
                if (!sourceNode || !canvasRef.current) return null;
                const rect = canvasRef.current.getBoundingClientRect();
                const sourcePoint = getNodeScreenAnchor(sourceNode, connectionDraft.sourceAnchor);
                const targetX = connectionDraft.pointer.x - rect.left;
                const targetY = connectionDraft.pointer.y - rect.top;
                return (
                  <line
                    x1={sourcePoint.x}
                    y1={sourcePoint.y}
                    x2={targetX}
                    y2={targetY}
                    stroke={edgeSelectedColor}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    opacity={0.8}
                    markerEnd="url(#arrowhead-selected)"
                  />
                );
              })()}
            </svg>

            {canvasState.nodes.map((node) => {
              const screen = worldToScreen(node.position.x, node.position.y, canvasState.viewport);
              const component = COMPONENT_BY_TYPE.get(node.type);
              const Icon = component ? component.icon : Box;
              const nodeIsHighlighted = highlightedNodeIds.has(node.id);
              const connectorClasses = {
                top: 'absolute left-1/2 -translate-x-1/2 -top-3.5',
                right: 'absolute top-1/2 -translate-y-1/2 -right-3.5',
                bottom: 'absolute left-1/2 -translate-x-1/2 -bottom-3.5',
                left: 'absolute top-1/2 -translate-y-1/2 -left-3.5',
              };
              const showNodeConnectors = showGlobalConnectors || selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={`group absolute rounded-xl overflow-visible ${
                    selectedNodeId === node.id
                      ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg shadow-blue-100/50'
                      : nodeIsHighlighted
                      ? 'ring-2 ring-emerald-400 ring-offset-1 shadow-lg shadow-emerald-100/50'
                      : 'ring-1 ring-gray-200 shadow-md hover:shadow-lg hover:ring-gray-300'
                  } bg-white transition-shadow`}
                  style={{
                    width: NODE_WIDTH * canvasState.viewport.zoom,
                    height: NODE_HEIGHT * canvasState.viewport.zoom,
                    left: screen.x,
                    top: screen.y,
                    opacity: nodeIsHighlighted || selectedNodeId === node.id || !highlightedInsight ? 1 : 0.58,
                  }}
                  onMouseDown={(event) => {
                    if (event.button !== 2) {
                      event.stopPropagation();
                    }
                    onNodeMouseDown(event, node);
                  }}
                >
                  {canEditStructure &&
                    NODE_ANCHORS.map((anchor) => (
                      <button
                        key={`${node.id}-${anchor}`}
                        type="button"
                        data-anchor={anchor}
                        aria-label={`Connector ${anchor}`}
                        className={`${connectorClasses[anchor]} z-20 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm transition-all duration-150 hover:bg-blue-600 ${
                          showNodeConnectors
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-75 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                        }`}
                        onMouseDown={(event) => startConnection(event, node.id)}
                        onMouseUp={(event) => completeConnection(event, node.id, anchor)}
                      />
                    ))}

                  {/* Top accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 ${
                      nodeIsHighlighted ? 'bg-emerald-400' : 'bg-transparent'
                    }`}
                  />

                  <div style={{ padding: nodePadding }}>
                    <div
                      className="flex items-center gap-1.5 text-gray-400 uppercase tracking-wider font-medium"
                      style={{ fontSize: nodeTypeFontSize, lineHeight: 1.15 }}
                    >
                      <span className="inline-flex items-center justify-center rounded bg-gray-100" style={{ width: nodeIconSize + 4, height: nodeIconSize + 4 }}>
                        <Icon size={nodeIconSize} className="text-gray-500" />
                      </span>
                      {component?.label || node.type}
                    </div>
                    <p
                      className="mt-1.5 font-bold text-gray-900 truncate leading-tight"
                      style={{ fontSize: nodeLabelFontSize, lineHeight: 1.2 }}
                    >
                      {node.label || 'Untitled'}
                    </p>
                  <p className="mt-1 text-gray-400 font-mono" style={{ fontSize: nodeIdFontSize - 1, lineHeight: 1.15 }}>
                      {node.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              );
            })}

            {canEditStructure && canvasState.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl px-8 py-6 text-center shadow-sm">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Box size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Start building your system</p>
                  <p className="text-xs text-gray-400">Drag components from the left panel onto the canvas</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg border border-gray-200 bg-white/95 backdrop-blur text-xs font-medium text-gray-500 shadow-sm">
              {saveLabel}
            </div>
            <div
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5"
              data-history-version={historyVersion}
            >
              <button
                type="button"
                onClick={undoCanvasChange}
                disabled={!canEditStructure || !canUndo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/95 backdrop-blur text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Undo (⌘Z)"
              >
                <Undo2 size={12} />
                Undo
              </button>
              <button
                type="button"
                onClick={redoCanvasChange}
                disabled={!canEditStructure || !canRedo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/95 backdrop-blur text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Redo (⌘⇧Z)"
              >
                <Redo2 size={12} />
                Redo
              </button>
            </div>
          </section>

          {isRightPanelHidden && (
            <button
              type="button"
              onClick={() => setIsRightPanelHidden(false)}
              className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 shadow-sm hover:border-gray-300 hover:shadow transition-all"
              title="Show properties panel"
            >
              <ChevronLeft size={13} />
              Properties
            </button>
          )}

          {!isRightPanelHidden && (
            <aside
              className={`canvas-properties-panel border-l border-gray-200 bg-white flex flex-col transition-all duration-300 shrink-0 ${
                isRightPanelExpanded ? 'w-[50vw]' : 'w-[280px]'
              }`}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Properties</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsRightPanelExpanded((prev) => !prev)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title={isRightPanelExpanded ? 'Restore panel width' : 'Expand panel'}
                  >
                    {isRightPanelExpanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRightPanelHidden(true)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Close properties panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setRightPanelMode('design')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  rightPanelMode === 'design'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Design
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('insights')}
                title={`Insights (${insights.length})`}
                aria-label={`Insights (${insights.length})`}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-all ${
                  rightPanelMode === 'insights'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Lightbulb size={11} />
                Insights
                {insights.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${rightPanelMode === 'insights' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{insights.length}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('comments')}
                title={`Comments (${comments.length})`}
                aria-label={`Comments (${comments.length})`}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-all ${
                  rightPanelMode === 'comments'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MessageSquare size={11} />
                Comments
                {comments.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${rightPanelMode === 'comments' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{comments.length}</span>
                )}
              </button>
            </div>

            {rightPanelMode === 'design' ? (
              <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {selectedEdge ? 'Connection' : selectedNode ? 'Component' : 'System'}
                </p>
              {selectedEdge ? (
                <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-gray-50/50">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Protocol</label>
                    <select
                      value={selectedEdge?.metadata?.protocol || ''}
                      onChange={(event) => setEdgeMetadataField('protocol', event.target.value)}
                      disabled={!canEditStructure}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    >
                      {EDGE_PROTOCOL_OPTIONS.map((option) => (
                        <option key={`protocol-${option || 'none'}`} value={option}>
                          {option || 'None'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Notes</label>
                    <textarea
                      rows={3}
                      value={selectedEdge?.metadata?.notes || ''}
                      onChange={(event) => setEdgeMetadataField('notes', event.target.value)}
                      readOnly={!canEditStructure}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      placeholder="Communication context"
                    />
                  </div>
                </div>
              ) : selectedNode ? (
                <>
                  <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-gray-50/50">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Identity</p>
                    {(() => {
                      const selectedComponent = COMPONENT_BY_TYPE.get(selectedNode.type);
                      return (
                        <div>
                          <p className="text-[11px] text-gray-400 font-medium">Type</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {selectedComponent?.label || selectedNode.type}
                          </p>
                          {selectedComponent?.description && (
                            <p className="text-xs text-gray-500 mt-1 leading-4">
                              {selectedComponent.description}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Label</label>
                      <input
                        type="text"
                        value={selectedNode?.label || ''}
                        onChange={(event) => setNodeLabel(event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-gray-50/50">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Context</p>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Purpose</label>
                      <textarea
                        rows={3}
                        value={selectedNode?.metadata?.purpose || ''}
                        onChange={(event) => setNodeMetadataField('purpose', event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        placeholder="Why this component exists"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Technology</label>
                      <input
                        type="text"
                        value={selectedNode?.metadata?.techChoice || ''}
                        onChange={(event) => setNodeMetadataField('techChoice', event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        placeholder="Optional implementation choice"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-gray-500">Responsibilities</label>
                        <button
                          type="button"
                          onClick={addNodeResponsibility}
                          disabled={!canEditStructure}
                          className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40"
                          title="Add responsibility"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(selectedNode?.metadata?.responsibilities || []).map((item, index) => (
                          <div key={`resp-${selectedNode.id}-${index}`} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item}
                              onChange={(event) => updateNodeResponsibility(index, event.target.value)}
                              readOnly={!canEditStructure}
                              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                              placeholder="Responsibility"
                            />
                            <button
                              type="button"
                              onClick={() => removeNodeResponsibility(index)}
                              disabled={!canEditStructure}
                              className="w-5 h-5 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                              title="Remove responsibility"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Notes</label>
                      <textarea
                        rows={3}
                        value={selectedNode?.metadata?.notes || ''}
                        onChange={(event) => setNodeMetadataField('notes', event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        placeholder="Free-form context"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-gray-50/50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">System</p>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Goal</label>
                    <textarea
                      rows={2}
                      value={canvasState?.systemMetadata?.goal || ''}
                      onChange={(event) => setSystemMetadataField('goal', event.target.value)}
                      readOnly={!canEditStructure}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      placeholder="What this system is trying to achieve"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-gray-500">Assumptions</label>
                      <button
                        type="button"
                        onClick={addSystemAssumption}
                        disabled={!canEditStructure}
                        className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40"
                        title="Add assumption"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {(canvasState?.systemMetadata?.assumptions || []).map((item, index) => (
                        <div key={`assump-${index}`} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={item}
                            onChange={(event) => updateSystemAssumption(index, event.target.value)}
                            readOnly={!canEditStructure}
                            className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Assumption"
                          />
                          <button
                            type="button"
                            onClick={() => removeSystemAssumption(index)}
                            disabled={!canEditStructure}
                            className="w-5 h-5 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                            title="Remove assumption"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Constraints</label>
                    <textarea
                      rows={3}
                      value={canvasState?.systemMetadata?.constraints || ''}
                      onChange={(event) => setSystemMetadataField('constraints', event.target.value)}
                      readOnly={!canEditStructure}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      placeholder="Known limitations or boundaries"
                    />
                  </div>
                </div>
              )}

              {!selectedEdge && (
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Nodes</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{canvasState.nodes.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Edges</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{canvasState.edges.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">User</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[140px]">{user.full_name || user.email}</span>
                  </div>
                </div>
              )}
              </div>
              </div>
            ) : rightPanelMode === 'insights' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Passive Insights</p>
                {insights.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-center">
                    <Lightbulb size={20} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-500">No observations yet.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Keep modeling and insights will appear.</p>
                  </div>
                ) : (
                  insightsByCategory.map(({ category, items }) =>
                    items.length === 0 ? null : (
                      <div key={`insight-group-${category}`} className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{category}</p>
                        {items.map((insight) => (
                          <button
                            key={insight.id}
                            type="button"
                            onMouseEnter={() => setHoveredInsightId(insight.id)}
                            onMouseLeave={() => setHoveredInsightId(null)}
                            onFocus={() => setHoveredInsightId(insight.id)}
                            onBlur={() => setHoveredInsightId(null)}
                            onClick={() => focusInsight(insight)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs leading-5 transition-all ${
                              activeInsightId === insight.id
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm'
                                : hoveredInsightId === insight.id
                                ? 'border-gray-300 bg-gray-50 text-gray-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {insight.message}
                          </button>
                        ))}
                      </div>
                    )
                  )
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Comments</p>
                {commentError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {commentError}
                  </div>
                )}

                {canComment ? (
                  <div className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/50">
                    <textarea
                      rows={3}
                      value={newCommentBody}
                      onChange={(event) => setNewCommentBody(event.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      placeholder="Write a comment..."
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateComment}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-3 text-xs text-gray-500 text-center">
                    Commenting is not available for your current role.
                  </div>
                )}

                {areCommentsLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-center">
                    <MessageSquare size={20} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-500">No comments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">{comments.map((comment) => renderCommentNode(comment))}</div>
                )}
              </div>
            )}
            </aside>
          )}
        </main>
      </div>
    </div>
  );
};

export default Canvas;
