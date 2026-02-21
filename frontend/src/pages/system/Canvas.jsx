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
} from 'lucide-react';
import api from '../../api';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 96;
const AUTOSAVE_DEBOUNCE_MS = 650;
const MOBILE_MAX_WIDTH = 767;

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
  const [saveStatus, setSaveStatus] = useState('saved');
  const [rightPanelMode, setRightPanelMode] = useState('design');
  const [isRightPanelHidden, setIsRightPanelHidden] = useState(false);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
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
      const response = await api.get(`systems/${systemId}/comments/`, { cache: false });
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
  const nodeZoom = canvasState.viewport.zoom;
  const nodePadding = Math.max(6, Math.round(12 * nodeZoom));
  const nodeTypeFontSize = Math.max(8, Math.round(12 * nodeZoom));
  const nodeLabelFontSize = Math.max(10, Math.round(16 * nodeZoom));
  const nodeIdFontSize = Math.max(8, Math.round(12 * nodeZoom));
  const nodeIconSize = Math.max(10, Math.round(14 * nodeZoom));

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Loading canvas...</div>;
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

  const renderCommentNode = (comment, depth = 0) => (
    <div key={comment.id} className="space-y-3" style={{ marginLeft: `${depth * 18}px` }}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
          {(comment.author_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {comment.author_name || 'Unknown'}
            </span>
            <span>{formatCommentTimestamp(comment.created_at)}</span>
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
            <p className="mt-1.5 text-sm text-gray-800 whitespace-pre-wrap leading-6">{comment.body}</p>
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
            <div className="mt-3 space-y-2">
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
        <div className="space-y-3 border-l border-gray-200 pl-3 ml-4">
          {comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {permissionNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] w-[min(92vw,620px)] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 shadow">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-medium leading-5">{permissionNotice}</p>
          </div>
        </div>
      )}
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
          {isReadOnlyStructure && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50 text-amber-800">
              {currentUserCanvasRole === 'commenter' ? 'Commenter Mode' : 'View Only'}
            </span>
          )}
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            type="button"
            className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {canEditStructure && (
          <aside
            className={`border-r border-gray-200 bg-gray-50 overflow-y-auto transition-all duration-300 ${
              isLeftPanelCollapsed ? 'w-0 -translate-x-full p-0 border-r-0' : 'w-64 p-3 translate-x-0'
            }`}
          >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Components</h2>
            <button
              type="button"
              onClick={() => setIsLeftPanelCollapsed(true)}
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-600 hover:text-gray-800"
              title="Hide components panel"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {COMPONENT_CATEGORIES.map((category) => {
              const CategoryIcon = category.icon;
              const isExpanded = expandedComponentCategories.has(category.key);
              return (
                <div key={category.key} className="rounded-md border border-gray-200 bg-white p-2">
                  <button
                    type="button"
                    onClick={() => toggleComponentCategory(category.key)}
                    className="w-full mb-1.5 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    <span className="flex items-center gap-1.5">
                      <CategoryIcon size={12} />
                      {category.label}
                    </span>
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="space-y-1.5">
                      {category.components.map((component) => (
                        <div
                          key={component.type}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData('application/structra-component-type', component.type)
                          }
                          className="w-full px-2.5 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-700 cursor-grab"
                          title={component.description}
                        >
                          <p className="text-xs font-medium text-gray-800 leading-4">{component.label}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-4">{component.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
        )}

        {canEditStructure && isLeftPanelCollapsed && (
          <button
            type="button"
            onClick={() => setIsLeftPanelCollapsed(false)}
            className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 shadow-sm"
            title="Show components panel"
          >
            <ChevronRight size={14} />
            Components
          </button>
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
            className={`relative flex-1 overflow-hidden bg-slate-50 ${
              isPanning ? 'cursor-grabbing' : activeTool === 'pan' ? 'cursor-grab' : 'cursor-default'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
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
                  edgeIsHighlighted || selectedEdgeId === edge.id || !highlightedInsight ? 1 : 0.45;
                const edgeStrokeWidth = selectedEdgeId === edge.id ? 2.7 : edgeIsHighlighted ? 2.4 : 2;

                return (
                  <g key={edge.id}>
                    <path
                      d={pathDefinition}
                      stroke={selectedEdgeId === edge.id ? '#0f172a' : '#111827'}
                      strokeWidth={edgeStrokeWidth}
                      opacity={edgeOpacity}
                      fill="none"
                      pathLength={100}
                    />
                    <path
                      d={pathDefinition}
                      stroke="#2563eb"
                      strokeWidth={edgeStrokeWidth}
                      opacity={edgeOpacity}
                      fill="none"
                      pathLength={100}
                      strokeDasharray="20 80"
                    />
                    <path
                      d={pathDefinition}
                      stroke="transparent"
                      strokeWidth="12"
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
                          r={6}
                          fill="#ffffff"
                          stroke="#2563eb"
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
                            fill="#bfdbfe"
                            stroke="#2563eb"
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
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeDasharray="4 4"
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
                top: 'absolute left-1/2 -translate-x-1/2 -top-2',
                right: 'absolute top-1/2 -translate-y-1/2 -right-2',
                bottom: 'absolute left-1/2 -translate-x-1/2 -bottom-2',
                left: 'absolute top-1/2 -translate-y-1/2 -left-2',
              };
              return (
                <div
                  key={node.id}
                  className={`absolute bg-white border rounded-lg shadow-sm ${
                    selectedNodeId === node.id
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : nodeIsHighlighted
                      ? 'border-teal-500 ring-2 ring-teal-100'
                      : 'border-gray-300'
                  }`}
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
                        className={`${connectorClasses[anchor]} w-4 h-4 rounded-full bg-blue-600 border-2 border-white`}
                        onMouseDown={(event) => startConnection(event, node.id)}
                        onMouseUp={(event) => completeConnection(event, node.id, anchor)}
                      />
                    ))}

                  <div style={{ padding: nodePadding }}>
                    <div
                      className="flex items-center gap-2 text-gray-500 uppercase tracking-wide"
                      style={{ fontSize: nodeTypeFontSize, lineHeight: 1.15 }}
                    >
                      <Icon size={nodeIconSize} />
                      {component?.label || node.type}
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

            {canEditStructure && canvasState.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 border border-dashed border-gray-300 rounded-xl px-5 py-4 text-center">
                  <p className="text-sm font-medium text-gray-700">Drag components from the left panel to start.</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md border border-gray-200 bg-white/90 text-xs text-gray-600">
              {saveLabel}
            </div>
            <div
              className="absolute bottom-3 left-3 inline-flex items-center gap-2"
              data-history-version={historyVersion}
            >
              <button
                type="button"
                onClick={undoCanvasChange}
                disabled={!canEditStructure || !canUndo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white/95 text-xs text-gray-700 disabled:opacity-40"
                title="Undo"
              >
                <Undo2 size={13} />
                Undo
              </button>
              <button
                type="button"
                onClick={redoCanvasChange}
                disabled={!canEditStructure || !canRedo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white/95 text-xs text-gray-700 disabled:opacity-40"
                title="Redo"
              >
                <Redo2 size={13} />
                Redo
              </button>
            </div>
          </section>

          {isRightPanelHidden && (
            <button
              type="button"
              onClick={() => setIsRightPanelHidden(false)}
              className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 shadow-sm"
              title="Show properties panel"
            >
              <ChevronLeft size={14} />
              Properties
            </button>
          )}

          {!isRightPanelHidden && (
            <aside
              className={`border-l border-gray-200 bg-white p-4 space-y-4 transition-all duration-300 ${
                isRightPanelExpanded ? 'w-[50vw]' : 'w-72'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Properties</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRightPanelExpanded((prev) => !prev)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-600 hover:text-gray-800"
                    title={isRightPanelExpanded ? 'Restore panel width' : 'Expand panel'}
                  >
                    {isRightPanelExpanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRightPanelHidden(true)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-600 hover:text-gray-800"
                    title="Close properties panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRightPanelMode('design')}
                className={`px-2.5 py-1.5 text-xs rounded-md border ${
                  rightPanelMode === 'design'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                Design
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('insights')}
                title={`Insights (${insights.length})`}
                aria-label={`Insights (${insights.length})`}
                className={`h-8 px-2.5 text-xs rounded-md border inline-flex items-center justify-center gap-1 ${
                  rightPanelMode === 'insights'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <Lightbulb size={12} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{insights.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('comments')}
                title={`Comments (${comments.length})`}
                aria-label={`Comments (${comments.length})`}
                className={`h-8 px-2.5 text-xs rounded-md border inline-flex items-center justify-center gap-1 ${
                  rightPanelMode === 'comments'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <MessageSquare size={12} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{comments.length}</span>
              </button>
            </div>

            {rightPanelMode === 'design' ? (
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(100vh-220px)]">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {selectedEdge ? 'Edge Metadata' : selectedNode ? 'Component Metadata' : 'System Metadata'}
                </p>
              {selectedEdge ? (
                <div className="rounded-md border border-gray-200 p-3 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Protocol</label>
                    <select
                      value={selectedEdge?.metadata?.protocol || ''}
                      onChange={(event) => setEdgeMetadataField('protocol', event.target.value)}
                      disabled={!canEditStructure}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white"
                    >
                      {EDGE_PROTOCOL_OPTIONS.map((option) => (
                        <option key={`protocol-${option || 'none'}`} value={option}>
                          {option || 'None'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={selectedEdge?.metadata?.notes || ''}
                      onChange={(event) => setEdgeMetadataField('notes', event.target.value)}
                      readOnly={!canEditStructure}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none"
                      placeholder="Communication context"
                    />
                  </div>
                </div>
              ) : selectedNode ? (
                <>
                  <div className="rounded-md border border-gray-200 p-3 space-y-3">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">What It Is</p>
                    {(() => {
                      const selectedComponent = COMPONENT_BY_TYPE.get(selectedNode.type);
                      return (
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm text-gray-900 mt-1">
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
                      <label className="text-xs text-gray-500 block mb-1">Label</label>
                      <input
                        type="text"
                        value={selectedNode?.label || ''}
                        onChange={(event) => setNodeLabel(event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-gray-200 p-3 space-y-3">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Why It Exists</p>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Purpose</label>
                      <textarea
                        rows={3}
                        value={selectedNode?.metadata?.purpose || ''}
                        onChange={(event) => setNodeMetadataField('purpose', event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none"
                        placeholder="Why this component exists"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Technology</label>
                      <input
                        type="text"
                        value={selectedNode?.metadata?.techChoice || ''}
                        onChange={(event) => setNodeMetadataField('techChoice', event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm"
                        placeholder="Optional implementation choice"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-500">Responsibilities</label>
                        <button
                          type="button"
                          onClick={addNodeResponsibility}
                          disabled={!canEditStructure}
                          className="inline-flex items-center justify-center w-6 h-6 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                          title="Add responsibility"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedNode?.metadata?.responsibilities || []).map((item, index) => (
                          <div key={`resp-${selectedNode.id}-${index}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(event) => updateNodeResponsibility(index, event.target.value)}
                              readOnly={!canEditStructure}
                              className="flex-1 border border-gray-300 rounded-md px-2.5 py-2 text-sm"
                              placeholder="Responsibility"
                            />
                            <button
                              type="button"
                              onClick={() => removeNodeResponsibility(index)}
                              disabled={!canEditStructure}
                              className="inline-flex items-center justify-center w-6 h-6 rounded border border-red-200 text-red-600 hover:bg-red-50"
                              title="Remove responsibility"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Notes</label>
                      <textarea
                        rows={3}
                        value={selectedNode?.metadata?.notes || ''}
                        onChange={(event) => setNodeMetadataField('notes', event.target.value)}
                        readOnly={!canEditStructure}
                        className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none"
                        placeholder="Free-form context"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-gray-200 p-3 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Goal</label>
                    <textarea
                      rows={2}
                      value={canvasState?.systemMetadata?.goal || ''}
                      onChange={(event) => setSystemMetadataField('goal', event.target.value)}
                      readOnly={!canEditStructure}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none"
                      placeholder="What this system is trying to achieve"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-500">Assumptions</label>
                      <button
                        type="button"
                        onClick={addSystemAssumption}
                        disabled={!canEditStructure}
                        className="inline-flex items-center justify-center w-6 h-6 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                        title="Add assumption"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(canvasState?.systemMetadata?.assumptions || []).map((item, index) => (
                        <div key={`assump-${index}`} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(event) => updateSystemAssumption(index, event.target.value)}
                            readOnly={!canEditStructure}
                            className="flex-1 border border-gray-300 rounded-md px-2.5 py-2 text-sm"
                            placeholder="Assumption"
                          />
                          <button
                            type="button"
                            onClick={() => removeSystemAssumption(index)}
                            disabled={!canEditStructure}
                            className="inline-flex items-center justify-center w-6 h-6 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            title="Remove assumption"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Constraints</label>
                    <textarea
                      rows={3}
                      value={canvasState?.systemMetadata?.constraints || ''}
                      onChange={(event) => setSystemMetadataField('constraints', event.target.value)}
                      readOnly={!canEditStructure}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none"
                      placeholder="Known limitations or boundaries"
                    />
                  </div>
                </div>
              )}

              {!selectedEdge && (
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
              )}
              </div>
            ) : rightPanelMode === 'insights' ? (
              <div className="space-y-3 overflow-y-auto pr-1 max-h-[calc(100vh-220px)]">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passive Insights</p>
                {insights.length === 0 ? (
                  <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-600">
                    No observations yet. Keep modeling and insights will update automatically.
                  </div>
                ) : (
                  insightsByCategory.map(({ category, items }) =>
                    items.length === 0 ? null : (
                      <div key={`insight-group-${category}`} className="rounded-md border border-gray-200 p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{category}</p>
                        {items.map((insight) => (
                          <button
                            key={insight.id}
                            type="button"
                            onMouseEnter={() => setHoveredInsightId(insight.id)}
                            onMouseLeave={() => setHoveredInsightId(null)}
                            onFocus={() => setHoveredInsightId(insight.id)}
                            onBlur={() => setHoveredInsightId(null)}
                            onClick={() => focusInsight(insight)}
                            className={`w-full text-left px-2.5 py-2 rounded-md border text-xs leading-5 transition ${
                              activeInsightId === insight.id
                                ? 'border-teal-200 bg-teal-50 text-teal-900'
                                : hoveredInsightId === insight.id
                                ? 'border-gray-300 bg-gray-50 text-gray-800'
                                : 'border-gray-200 bg-white text-gray-700'
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
              <div className="space-y-3 overflow-y-auto pr-1 max-h-[calc(100vh-220px)]">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Canvas Comments</p>
                {commentError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {commentError}
                  </div>
                )}

                {canComment ? (
                  <div className="rounded-md border border-gray-200 p-3 space-y-2">
                    <textarea
                      rows={3}
                      value={newCommentBody}
                      onChange={(event) => setNewCommentBody(event.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm resize-none"
                      placeholder="Write a comment..."
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateComment}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Post Comment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-600">
                    Commenting is not available for your current role.
                  </div>
                )}

                {areCommentsLoading ? (
                  <div className="text-sm text-gray-500">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-600">
                    No comments yet.
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
