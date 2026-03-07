/**
 * evaluateRules.js — Structra Rule Engine
 * Evaluates all 50 rules (F-01..F-20, P-01..P-30) against a canvasState.
 *
 * Usage:
 *   import { evaluateRules, buildGeminiPrompt } from './evaluateRules';
 *   const result = evaluateRules(canvasState);
 *   const prompt = buildGeminiPrompt(result, canvasState.systemMetadata);
 *
 * Each rule returns:
 *   { id, ruleTier, passed, confidence, reason, affectedNodeIds, affectedEdgeIds }
 *
 * confidence: 'high' | 'medium' | 'low'
 *   high   — rule can be evaluated with certainty from graph structure
 *   medium — rule requires metadata keywords; missing metadata lowers confidence
 *   low    — rule cannot be reliably checked without more context; result is advisory
 */

// ─── Node type sets (mirrors Canvas.jsx) ────────────────────────────────────

const CLIENT_TYPES = new Set(['CLIENT']);
const EXTERNAL_TYPES = new Set(['CLIENT', 'EXTERNAL_SERVICE']);
const GUARD_TYPES = new Set(['CDN_EDGE_CACHE', 'API_GATEWAY', 'LOAD_BALANCER', 'WEB_APPLICATION_FIREWALL']);
const AUTH_TYPES = new Set(['AUTHENTICATION_SERVICE', 'AUTHORIZATION_SERVICE', 'API_GATEWAY', 'WEB_APPLICATION_FIREWALL', 'ACCESS_CONTROL_SYSTEM']);
const COMPUTE_TYPES = new Set(['API_BACKEND_SERVICE', 'MICROSERVICE', 'BACKGROUND_WORKER', 'SERVERLESS_FUNCTION', 'BATCH_JOB']);
const WORKER_TYPES = new Set(['BACKGROUND_WORKER', 'BATCH_JOB', 'SERVERLESS_FUNCTION']);
const DB_TYPES = new Set(['RELATIONAL_DATABASE', 'NOSQL_DATABASE', 'OBJECT_STORAGE', 'TIME_SERIES_DATABASE']);
const CACHE_TYPES = new Set(['CACHE', 'IN_MEMORY_STORE']);
const QUEUE_TYPES = new Set(['MESSAGE_QUEUE', 'EVENT_BUS', 'STREAM_PROCESSOR']);
const OBSERVABILITY_TYPES = new Set(['LOGGING_SYSTEM', 'METRICS_SYSTEM', 'TRACING_SYSTEM', 'ALERTING_SYSTEM']);
const REPLICATION_TYPES = new Set(['REPLICATION_SYSTEM', 'BACKUP_SERVICE', 'DISASTER_RECOVERY_SYSTEM']);
const SEARCH_TYPES = new Set(['SEARCH_ENGINE']);
const ANALYTICS_TYPES = new Set(['ANALYTICS_ENGINE', 'FEATURE_STORE', 'RECOMMENDATION_ENGINE']);
const ZERO_TRUST_TYPES = new Set(['SERVICE_MESH', 'POLICY_ENGINE', 'ACCESS_CONTROL_SYSTEM']);
const SECRETS_TYPES = new Set(['SECRETS_MANAGER']);
const AUDIT_TYPES = new Set(['AUDIT_LOG']);
const OLAP_TYPES = new Set(['ANALYTICS_ENGINE', 'FEATURE_STORE']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const meta = (node) => {
  const m = node?.metadata || {};
  return `${m.purpose || ''} ${m.techChoice || ''} ${m.notes || ''} ${(m.responsibilities || []).join(' ')}`.toLowerCase();
};

const edgeMeta = (edge) =>
  `${edge?.metadata?.protocol || ''} ${edge?.metadata?.notes || ''}`.toLowerCase();

const hasKeyword = (text, keywords) =>
  keywords.some((kw) => text.includes(kw));

const nodeHasKeyword = (node, keywords) => hasKeyword(meta(node), keywords);

const edgeProtocol = (edge) =>
  (edge?.metadata?.protocol || '').toUpperCase().trim();

const isAsync = (edge) => edgeProtocol(edge) === 'ASYNC';

const nodesOfType = (nodes, typeSet) => nodes.filter((n) => typeSet.has(n.type));

const hasNodeType = (nodes, typeSet) => nodes.some((n) => typeSet.has(n.type));

const directNeighbors = (nodeId, edges, direction = 'out') => {
  if (direction === 'out') return edges.filter((e) => e.source === nodeId).map((e) => e.target);
  if (direction === 'in') return edges.filter((e) => e.target === nodeId).map((e) => e.source);
  return [
    ...edges.filter((e) => e.source === nodeId).map((e) => e.target),
    ...edges.filter((e) => e.target === nodeId).map((e) => e.source),
  ];
};

// BFS from a set of start nodes, following edges in given direction
const bfsReachable = (startIds, edges, nodeMap, direction = 'out') => {
  const visited = new Set(startIds);
  const queue = [...startIds];
  while (queue.length > 0) {
    const id = queue.shift();
    const neighbors = directNeighbors(id, edges, direction);
    for (const nid of neighbors) {
      if (!visited.has(nid) && nodeMap.has(nid)) {
        visited.add(nid);
        queue.push(nid);
      }
    }
  }
  return visited;
};

const normalizeRuleTier = (id, ruleTier) => {
  if (ruleTier === 'pro') {
    const match = /^P-(\d+)$/.exec(id || '');
    if (match && Number(match[1]) >= 21) return 'enterprise';
  }
  return ruleTier;
};

export function isRuleApplicableForTier(ruleTier, workspaceTier) {
  if (workspaceTier === 'core') return ruleTier === 'basic';
  return true; // individual, team, enterprise get all rules
}

const rule = (id, ruleTier, passed, confidence, reason, affectedNodeIds = [], affectedEdgeIds = []) => ({
  id,
  ruleTier: normalizeRuleTier(id, ruleTier),
  passed,
  confidence,
  reason,
  affectedNodeIds,
  affectedEdgeIds,
});

// ─── Main evaluator ──────────────────────────────────────────────────────────

export function evaluateRules(canvasState) {
  const workspaceTier = (canvasState?.workspaceTier || 'core').toLowerCase();
  const nodes = Array.isArray(canvasState?.nodes) ? canvasState.nodes : [];
  const edges = Array.isArray(canvasState?.edges) ? canvasState.edges : [];
  const sysm = canvasState?.systemMetadata || {};

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Precompute adjacency
  const outgoing = new Map(nodes.map((n) => [n.id, []]));
  const incoming = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => {
    if (outgoing.has(e.source)) outgoing.get(e.source).push(e);
    if (incoming.has(e.target)) incoming.get(e.target).push(e);
  });

  const results = [];

  // ── FREE TIER ─────────────────────────────────────────────────────────────

  // F-01 · API Protocol Fit
  // Checks that edges between services have a protocol set.
  // Also checks that internal service-to-service edges use INTERNAL/gRPC, not HTTP.
  (() => {
    const protocolEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && (COMPUTE_TYPES.has(src.type) || GUARD_TYPES.has(src.type));
    });
    const missing = protocolEdges.filter((e) => !edgeProtocol(e));
    const internalMisuse = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      if (!src || !tgt) return false;
      // Two compute services talking over unlabeled or HTTP when it should be INTERNAL
      return COMPUTE_TYPES.has(src.type) && COMPUTE_TYPES.has(tgt.type) &&
        edgeProtocol(e) === 'HTTP';
    });

    if (protocolEdges.length === 0) {
      results.push(rule('F-01', 'basic', null, 'low',
        'No service edges found to evaluate protocol fit.'));
      return;
    }
    if (missing.length > 0) {
      results.push(rule('F-01', 'basic', false, 'high',
        `${missing.length} service connection(s) have no protocol defined. Every edge between services must declare HTTP, ASYNC, INTERNAL, or equivalent.`,
        [...new Set([...missing.map(e => e.source), ...missing.map(e => e.target)])],
        missing.map(e => e.id)));
      return;
    }
    if (internalMisuse.length > 0) {
      results.push(rule('F-01', 'basic', false, 'medium',
        `${internalMisuse.length} internal service-to-service edge(s) use HTTP where INTERNAL/gRPC is more appropriate for low-latency internal calls.`,
        [...new Set([...internalMisuse.map(e => e.source), ...internalMisuse.map(e => e.target)])],
        internalMisuse.map(e => e.id)));
      return;
    }
    results.push(rule('F-01', 'basic', true, 'high',
      'All service edges have protocols defined. No obvious mismatches detected.'));
  })();

  // F-02 · Single Point of Failure
  // A critical-path compute node with no redundant sibling = SPOF
  (() => {
    const publicEntries = nodes.filter((n) => EXTERNAL_TYPES.has(n.type)).map((n) => n.id);
    if (publicEntries.length === 0) {
      results.push(rule('F-02', 'basic', null, 'low',
        'No public entry point found. Cannot trace critical path for SPOF analysis.'));
      return;
    }

    const criticalPath = bfsReachable(publicEntries, edges, nodeMap, 'out');
    const criticalCompute = nodes.filter(
      (n) => COMPUTE_TYPES.has(n.type) && criticalPath.has(n.id)
    );

    // A compute node is redundant if another node of the same type also sits on the critical path
    // and there is a load balancer pointing to both (simplified: same type + LB present in path)
    const hasLB = nodes.some((n) => n.type === 'LOAD_BALANCER' && criticalPath.has(n.id));
    const singletons = criticalCompute.filter((n) => {
      const sameType = criticalCompute.filter((other) => other.type === n.type && other.id !== n.id);
      return sameType.length === 0;
    });

    if (!hasLB && singletons.length > 0) {
      results.push(rule('F-02', 'basic', false, 'high',
        `${singletons.length} compute component(s) on the critical path have no redundant counterpart and no load balancer is present.`,
        singletons.map((n) => n.id)));
    } else {
      results.push(rule('F-02', 'basic', true, 'medium',
        'No obvious single points of failure detected on the critical path.'));
    }
  })();

  // F-03 · Stateless Service Layer
  (() => {
    const computeNodes = nodesOfType(nodes, COMPUTE_TYPES).filter(n => !WORKER_TYPES.has(n.type));
    if (computeNodes.length === 0) {
      results.push(rule('F-03', 'basic', null, 'low', 'No compute nodes to evaluate statefulness.'));
      return;
    }
    const stateful = computeNodes.filter((n) =>
      nodeHasKeyword(n, ['stateful', 'sticky session', 'in-memory session', 'local session', 'session stored'])
    );
    const undocumented = computeNodes.filter((n) =>
      !nodeHasKeyword(n, ['stateless', 'session', 'state', 'externalized', 'jwt', 'token'])
    );

    if (stateful.length > 0) {
      results.push(rule('F-03', 'basic', false, 'high',
        `${stateful.length} compute node(s) explicitly mention in-memory or sticky session state. These services cannot scale horizontally.`,
        stateful.map((n) => n.id)));
    } else if (undocumented.length > 0) {
      results.push(rule('F-03', 'basic', false, 'medium',
        `${undocumented.length} compute node(s) do not document their session/state strategy. Statelessness must be explicit.`,
        undocumented.map((n) => n.id)));
    } else {
      results.push(rule('F-03', 'basic', true, 'medium',
        'Compute nodes document their session strategy. No in-memory state detected.'));
    }
  })();

  // F-04 · Database Selection Justification
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    if (dbs.length === 0) {
      results.push(rule('F-04', 'basic', null, 'low', 'No database nodes found.'));
      return;
    }
    const unjustified = dbs.filter((n) =>
      !nodeHasKeyword(n, [
        'relational', 'transactional', 'acid', 'nosql', 'document', 'key-value', 'key value',
        'column', 'time-series', 'wide-row', 'object', 'blob', 'high-throughput', 'flexible schema',
        'access pattern', 'workload', 'oltp', 'olap',
      ])
    );
    if (unjustified.length > 0) {
      results.push(rule('F-04', 'basic', false, 'medium',
        `${unjustified.length} database(s) have no access-pattern justification in their metadata. Document why this storage type was chosen.`,
        unjustified.map((n) => n.id)));
    } else {
      results.push(rule('F-04', 'basic', true, 'medium',
        'All databases document their access-pattern justification.'));
    }
  })();

  // F-05 · Caching Layer Presence
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    const caches = nodesOfType(nodes, CACHE_TYPES);
    const highRead = nodeHasKeyword({ metadata: sysm }, ['read-heavy', 'read heavy', 'high read', '>80% read', '80% read', 'cache', 'qps', '1000 qps', '10k qps', '100k qps']);

    if (dbs.length === 0) {
      results.push(rule('F-05', 'basic', null, 'low', 'No database found to evaluate caching need.'));
      return;
    }
    if (highRead && caches.length === 0) {
      results.push(rule('F-05', 'basic', false, 'high',
        'System metadata suggests a read-heavy workload but no caching layer is present. Add a Cache or In-Memory Store between the application and database.',
        dbs.map((n) => n.id)));
    } else if (!highRead && caches.length === 0) {
      results.push(rule('F-05', 'basic', false, 'low',
        'No caching layer is present. If this system is read-heavy (>1,000 QPS), a cache is required.'));
    } else {
      results.push(rule('F-05', 'basic', true, 'medium',
        'Caching layer is present.'));
    }
  })();

  // F-06 · Cache Eviction Policy Declared
  (() => {
    const caches = nodesOfType(nodes, CACHE_TYPES);
    if (caches.length === 0) {
      results.push(rule('F-06', 'basic', null, 'low', 'No cache nodes to evaluate eviction policy.'));
      return;
    }
    const undeclared = caches.filter((n) =>
      !nodeHasKeyword(n, ['lru', 'lfu', 'ttl', 'eviction', 'expiry', 'expire', 'fifo', 'write-through', 'write-back'])
    );
    if (undeclared.length > 0) {
      results.push(rule('F-06', 'basic', false, 'medium',
        `${undeclared.length} cache(s) have no eviction policy declared (LRU, LFU, TTL, etc.). Document this in the node metadata.`,
        undeclared.map((n) => n.id)));
    } else {
      results.push(rule('F-06', 'basic', true, 'medium',
        'All caches declare an eviction policy.'));
    }
  })();

  // F-07 · Load Balancer Placement
  (() => {
    // Find any set of compute nodes that share the same type (implying multiple instances)
    // but have no load balancer as a common upstream node
    const lb = nodes.filter((n) => n.type === 'LOAD_BALANCER');
    const computeNodes = nodesOfType(nodes, COMPUTE_TYPES);
    const multipleCompute = computeNodes.length > 1;

    if (!multipleCompute) {
      results.push(rule('F-07', 'basic', null, 'low',
        'Only one compute instance is modeled. Load balancer rule applies when multiple instances of the same service tier exist.'));
      return;
    }

    // Check: for each compute type with >1 instance, there should be a LB
    const typeGroups = {};
    computeNodes.forEach((n) => {
      typeGroups[n.type] = typeGroups[n.type] || [];
      typeGroups[n.type].push(n);
    });
    const unbalanced = Object.entries(typeGroups)
      .filter(([, group]) => group.length > 1)
      .filter(([, group]) => {
        // Check if there is at least one LB with an outgoing edge to any member of this group
        return !lb.some((lbNode) =>
          group.some((computeNode) =>
            edges.some((e) => e.source === lbNode.id && e.target === computeNode.id)
          )
        );
      });

    if (lb.length === 0 && multipleCompute) {
      results.push(rule('F-07', 'basic', false, 'high',
        'Multiple compute instances are present but no Load Balancer is modeled. Traffic cannot be distributed.',
        computeNodes.map((n) => n.id)));
    } else if (unbalanced.length > 0) {
      const affected = unbalanced.flatMap(([, group]) => group).map((n) => n.id);
      results.push(rule('F-07', 'basic', false, 'medium',
        `${unbalanced.length} group(s) of compute nodes have no load balancer routing to them despite having multiple instances.`,
        affected));
    } else {
      results.push(rule('F-07', 'basic', true, 'high',
        'Load balancers are correctly placed in front of scaled service tiers.'));
    }
  })();

  // F-08 · HTTP Status Code Correctness
  // Cannot inspect actual code, so checks if any API/gateway node documents status code strategy
  (() => {
    const apiNodes = nodes.filter((n) =>
      n.type === 'API_BACKEND_SERVICE' || n.type === 'API_GATEWAY'
    );
    if (apiNodes.length === 0) {
      results.push(rule('F-08', 'basic', null, 'low', 'No API nodes found to evaluate HTTP status code strategy.'));
      return;
    }
    const undocumented = apiNodes.filter((n) =>
      !nodeHasKeyword(n, ['2xx', '4xx', '5xx', '200', '201', '400', '401', '403', '404', '500', 'status code', 'http code', 'error response', 'error handling'])
    );
    if (undocumented.length > 0) {
      results.push(rule('F-08', 'basic', false, 'low',
        `${undocumented.length} API node(s) have no status code strategy documented. Document error/success code conventions in node notes.`,
        undocumented.map((n) => n.id)));
    } else {
      results.push(rule('F-08', 'basic', true, 'low',
        'API nodes document HTTP status code conventions.'));
    }
  })();

  // F-09 · Idempotency for Write Operations
  (() => {
    const apiNodes = nodes.filter((n) => n.type === 'API_BACKEND_SERVICE' || n.type === 'MICROSERVICE');
    const paymentOrOrder = apiNodes.filter((n) =>
      nodeHasKeyword(n, ['payment', 'order', 'checkout', 'charge', 'transaction', 'purchase', 'mutation', 'write'])
    );
    if (paymentOrOrder.length === 0) {
      // Advisory — we can't know which endpoints are write ops without more info
      results.push(rule('F-09', 'basic', null, 'low',
        'No payment or order-related services identified. Manually verify idempotency for all non-idempotent write endpoints.'));
      return;
    }
    const nonIdempotent = paymentOrOrder.filter((n) =>
      !nodeHasKeyword(n, ['idempotent', 'idempotency key', 'idempotency', 'dedupe', 'deduplication'])
    );
    if (nonIdempotent.length > 0) {
      results.push(rule('F-09', 'basic', false, 'medium',
        `${nonIdempotent.length} payment/order service(s) do not document an idempotency key strategy. Network retries will cause duplicate operations.`,
        nonIdempotent.map((n) => n.id)));
    } else {
      results.push(rule('F-09', 'basic', true, 'medium',
        'Payment and order services document idempotency key strategies.'));
    }
  })();

  // F-10 · Authentication Mechanism Defined
  (() => {
    const hasPublicEntry = hasNodeType(nodes, EXTERNAL_TYPES);
    const hasAuthGuard = hasNodeType(nodes, AUTH_TYPES);
    if (!hasPublicEntry) {
      results.push(rule('F-10', 'basic', null, 'low', 'No public entry point found. Auth check skipped.'));
      return;
    }
    if (!hasAuthGuard) {
      const publicNodes = nodesOfType(nodes, EXTERNAL_TYPES);
      results.push(rule('F-10', 'basic', false, 'high',
        'System has a public entry point but no Authentication Service, API Gateway, or WAF is present. External APIs must have an explicit auth mechanism.',
        publicNodes.map((n) => n.id)));
      return;
    }
    // Check if the auth guard documents its mechanism
    const authNodes = nodesOfType(nodes, AUTH_TYPES);
    const undocumented = authNodes.filter((n) =>
      !nodeHasKeyword(n, ['jwt', 'oauth', 'oauth2', 'api key', 'session', 'mtls', 'saml', 'oidc', 'bearer', 'basic auth'])
    );
    if (undocumented.length > 0) {
      results.push(rule('F-10', 'basic', false, 'medium',
        `${undocumented.length} auth component(s) do not specify their mechanism (JWT, OAuth2, API Key, mTLS, etc.).`,
        undocumented.map((n) => n.id)));
    } else {
      results.push(rule('F-10', 'basic', true, 'high',
        'Authentication mechanism is defined for all public-facing entry points.'));
    }
  })();

  // F-11 · DNS and CDN for Public-Facing Systems
  (() => {
    const hasCDN = nodes.some((n) => n.type === 'CDN_EDGE_CACHE');
    const hasDNS = nodes.some((n) => n.type === 'DNS');
    const hasPublic = hasNodeType(nodes, EXTERNAL_TYPES);
    const isGlobal = nodeHasKeyword({ metadata: sysm }, ['global', 'cdn', 'static', 'geo', 'distributed', 'worldwide', 'latency']);

    if (!hasPublic) {
      results.push(rule('F-11', 'basic', null, 'low', 'No public-facing entry found.'));
      return;
    }
    if (isGlobal && !hasCDN) {
      results.push(rule('F-11', 'basic', false, 'high',
        'System goal mentions global/distributed traffic but no CDN is present. Route static content through a CDN to reduce latency.'));
    } else if (!hasDNS && !hasCDN) {
      results.push(rule('F-11', 'basic', false, 'medium',
        'Public-facing system has no DNS or CDN layer modeled. Add DNS routing and consider a CDN for global reach.'));
    } else {
      results.push(rule('F-11', 'basic', true, 'medium',
        'DNS and/or CDN layer is present for public-facing traffic.'));
    }
  })();

  // F-12 · Synchronous vs Asynchronous Boundary Declared
  (() => {
    const compute = nodesOfType(nodes, COMPUTE_TYPES);
    if (compute.length < 2) {
      results.push(rule('F-12', 'basic', null, 'low', 'Not enough services to evaluate sync/async boundaries.'));
      return;
    }
    const interServiceEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && COMPUTE_TYPES.has(src.type) && COMPUTE_TYPES.has(tgt.type);
    });
    const unlabeled = interServiceEdges.filter((e) => !edgeProtocol(e));
    const longRunningSync = interServiceEdges.filter((e) => {
      const tgt = nodeMap.get(e.target);
      return !isAsync(e) && tgt && WORKER_TYPES.has(tgt.type);
    });

    if (unlabeled.length > 0) {
      results.push(rule('F-12', 'basic', false, 'high',
        `${unlabeled.length} inter-service edge(s) have no protocol. Sync vs async boundary must be explicit.`,
        [...new Set([...unlabeled.map(e => e.source), ...unlabeled.map(e => e.target)])],
        unlabeled.map(e => e.id)));
    } else if (longRunningSync.length > 0) {
      results.push(rule('F-12', 'basic', false, 'high',
        `${longRunningSync.length} background worker(s) are reached via synchronous calls. Long-running tasks must be queued asynchronously.`,
        longRunningSync.map(e => e.target),
        longRunningSync.map(e => e.id)));
    } else {
      results.push(rule('F-12', 'basic', true, 'high',
        'Synchronous and asynchronous boundaries are declared on all inter-service edges.'));
    }
  })();

  // F-13 · Data Replication Strategy Stated
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    if (dbs.length === 0) {
      results.push(rule('F-13', 'basic', null, 'low', 'No databases to evaluate replication.'));
      return;
    }
    const hasReplication = hasNodeType(nodes, REPLICATION_TYPES) ||
      dbs.some((n) => nodeHasKeyword(n, ['replica', 'replication', 'read replica', 'standby', 'follower', 'primary', 'master']));
    if (!hasReplication) {
      results.push(rule('F-13', 'basic', false, 'medium',
        'No replication strategy is stated for any database. Add a Replication System node or document replica strategy in database metadata.',
        dbs.map((n) => n.id)));
    } else {
      results.push(rule('F-13', 'basic', true, 'medium',
        'Database replication strategy is present.'));
    }
  })();

  // F-14 · Monolith vs Microservice Decision Justified
  (() => {
    const microservices = nodes.filter((n) => n.type === 'MICROSERVICE');
    const apiServices = nodes.filter((n) => n.type === 'API_BACKEND_SERVICE');
    const isMicro = microservices.length > 1;
    const isMonolith = apiServices.length === 1 && microservices.length === 0;
    const goalText = (sysm.goal || '').toLowerCase();

    if (!isMicro && !isMonolith) {
      results.push(rule('F-14', 'basic', null, 'low',
        'Architecture style is ambiguous. Cannot classify as monolith or microservices.'));
      return;
    }
    if (isMicro) {
      const smallTeam = hasKeyword(goalText, ['small team', '2 person', 'solo', 'mvp', 'prototype', 'startup', '1 developer']);
      if (smallTeam) {
        results.push(rule('F-14', 'basic', false, 'medium',
          'System goal suggests a small team or MVP but microservices architecture is used. This is premature complexity.',
          microservices.map((n) => n.id)));
        return;
      }
    }
    if (isMonolith) {
      const needsScaling = hasKeyword(goalText, ['independent scaling', 'scale independently', 'high availability', 'millions of users']);
      if (needsScaling) {
        results.push(rule('F-14', 'basic', false, 'medium',
          'System goal requires independent scaling but a monolith is used. Consider microservices for components with distinct scaling profiles.',
          apiServices.map((n) => n.id)));
        return;
      }
    }
    results.push(rule('F-14', 'basic', true, 'medium',
      'Architecture style appears appropriate for the stated system goal.'));
  })();

  // F-15 · Back-of-Envelope Estimates Present
  (() => {
    const goalAndConstraints = `${sysm.goal || ''} ${sysm.constraints || ''} ${(sysm.assumptions || []).join(' ')}`.toLowerCase();
    const hasEstimates = hasKeyword(goalAndConstraints, [
      'qps', 'rps', 'requests per second', 'requests/second',
      'storage', 'gb', 'tb', 'bandwidth', 'throughput',
      'dau', 'mau', 'daily active', 'monthly active',
      'peak', 'estimate', 'capacity',
    ]);
    if (!hasEstimates) {
      results.push(rule('F-15', 'basic', false, 'medium',
        'No capacity estimates found in system metadata. Add QPS, storage, and bandwidth estimates to the system goal or assumptions.'));
    } else {
      results.push(rule('F-15', 'basic', true, 'medium',
        'Capacity estimates are present in system metadata.'));
    }
  })();

  // F-16 · Functional vs Non-Functional Requirements Separation
  (() => {
    const goalAndConstraints = `${sysm.goal || ''} ${sysm.constraints || ''}`.toLowerCase();
    const hasFunctional = goalAndConstraints.length > 20;
    const hasNonFunctional = hasKeyword(goalAndConstraints, [
      'latency', 'availability', 'sla', 'uptime', 'consistency', 'durability',
      'throughput', 'response time', 'p99', 'p95', 'p50', 'nfr',
    ]);
    if (!hasFunctional) {
      results.push(rule('F-16', 'basic', false, 'medium',
        'System goal is not defined. Both functional and non-functional requirements must be stated.'));
    } else if (!hasNonFunctional) {
      results.push(rule('F-16', 'basic', false, 'medium',
        'Non-functional requirements (latency, availability SLA, consistency) are not stated in system constraints. Add NFRs to the Constraints field.'));
    } else {
      results.push(rule('F-16', 'basic', true, 'medium',
        'Both functional and non-functional requirements are present.'));
    }
  })();

  // F-17 · Failure Mode Acknowledgment
  (() => {
    const allMeta = `${sysm.goal || ''} ${sysm.constraints || ''} ${(sysm.assumptions || []).join(' ')} ${nodes.map((n) => meta(n)).join(' ')}`.toLowerCase();
    const hasFailureHandling = hasKeyword(allMeta, [
      'retry', 'backoff', 'circuit breaker', 'circuit-breaker', 'fallback',
      'graceful degradation', 'degraded', 'failure mode', 'fault tolerance',
      'timeout', 'dead letter', 'dlq',
    ]);
    const twoFailureModes = (allMeta.match(/failure mode/g) || []).length >= 1 || hasFailureHandling;
    if (!hasFailureHandling) {
      results.push(rule('F-17', 'basic', false, 'medium',
        'No failure handling patterns identified (retry, circuit breaker, fallback, graceful degradation). Document at least two failure modes and their mitigations.'));
    } else {
      results.push(rule('F-17', 'basic', true, 'medium',
        'Failure handling patterns are documented in the design.'));
    }
  })();

  // F-18 · OLTP / OLAP Separation
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    const analytics = nodesOfType(nodes, OLAP_TYPES);
    if (dbs.length === 0 || analytics.length === 0) {
      results.push(rule('F-18', 'basic', null, 'low',
        'No analytics engine found alongside a transactional database. Rule applies when both are present.'));
      return;
    }
    // Check if analytics node is directly connected to primary OLTP db (bad)
    const oltpDbs = dbs.filter((n) => n.type === 'RELATIONAL_DATABASE');
    const analyticsDirectlyOnOLTP = analytics.some((an) =>
      oltpDbs.some((db) =>
        edges.some((e) =>
          (e.source === db.id && e.target === an.id) ||
          (e.source === an.id && e.target === db.id)
        )
      )
    );
    if (analyticsDirectlyOnOLTP) {
      results.push(rule('F-18', 'basic', false, 'high',
        'Analytics engine is directly connected to the transactional database. OLAP and OLTP workloads must be separated.',
        [...oltpDbs.map((n) => n.id), ...analytics.map((n) => n.id)]));
    } else {
      results.push(rule('F-18', 'basic', true, 'medium',
        'OLTP and OLAP workloads appear to be separated.'));
    }
  })();

  // F-19 · Unique ID Strategy Defined
  (() => {
    const distributed = nodes.filter((n) =>
      n.type === 'MICROSERVICE' || nodes.filter((x) => x.type === 'MICROSERVICE').length > 1
    );
    if (distributed.length === 0) {
      results.push(rule('F-19', 'basic', null, 'low',
        'Single-service system. UUID strategy is advisory — auto-increment is fine for non-distributed setups.'));
      return;
    }
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasIdStrategy = hasKeyword(allMeta, ['uuid', 'snowflake', 'ulid', 'ticket server', 'id generation', 'globally unique', 'distributed id']);
    const usesAutoIncrement = hasKeyword(allMeta, ['auto-increment', 'auto increment', 'autoincrement', 'serial id', 'integer id']);
    if (usesAutoIncrement) {
      results.push(rule('F-19', 'basic', false, 'high',
        'Auto-increment IDs are documented in a distributed/microservice system. This causes collisions across shards. Use UUID, Snowflake, or ULID.'));
    } else if (!hasIdStrategy) {
      results.push(rule('F-19', 'basic', false, 'medium',
        'No unique ID generation strategy documented for distributed entities. Specify UUID, Snowflake, ULID, or a ticket server in node metadata.'));
    } else {
      results.push(rule('F-19', 'basic', true, 'medium',
        'Unique ID strategy is documented.'));
    }
  })();

  // F-20 · External Dependency Boundaries
  (() => {
    const externalServices = nodes.filter((n) => n.type === 'EXTERNAL_SERVICE');
    if (externalServices.length === 0) {
      // Check if any node metadata mentions third-party services without an EXTERNAL_SERVICE node
      const allMeta = nodes.map((n) => meta(n)).join(' ');
      const mentionsExternal = hasKeyword(allMeta, [
        'stripe', 'twilio', 'sendgrid', 'firebase', 'aws', 'google', 'third-party', 'third party', 'external api', 'payment gateway', 'sms', 'email provider',
      ]);
      if (mentionsExternal) {
        results.push(rule('F-20', 'basic', false, 'medium',
          'Node metadata references third-party services but no External Service boundary nodes are drawn. External dependencies must be explicit nodes.'));
      } else {
        results.push(rule('F-20', 'basic', null, 'low',
          'No external service boundaries found. If the system has third-party dependencies, model them as External Service nodes.'));
      }
      return;
    }
    const undocumented = externalServices.filter((n) =>
      !nodeHasKeyword(n, ['stripe', 'twilio', 'sendgrid', 'email', 'sms', 'payment', 'push', 'webhook', 'third-party', 'provider', 'api']) &&
      !meta(n).trim()
    );
    if (undocumented.length > 0) {
      results.push(rule('F-20', 'basic', false, 'low',
        `${undocumented.length} External Service node(s) have no documentation about what they are. Add a purpose or notes to each.`,
        undocumented.map((n) => n.id)));
    } else {
      results.push(rule('F-20', 'basic', true, 'medium',
        'All external dependencies are modeled as explicit boundary nodes.'));
    }
  })();

  // ── PAID TIER ─────────────────────────────────────────────────────────────

  // P-01 · Horizontal Scaling Path Defined
  (() => {
    const compute = nodesOfType(nodes, COMPUTE_TYPES);
    if (compute.length === 0) {
      results.push(rule('P-01', 'pro', null, 'low', 'No compute nodes.'));
      return;
    }
    const noScalingPath = compute.filter((n) =>
      !nodeHasKeyword(n, ['horizontal', 'scale out', 'replicas', 'auto-scaling', 'autoscaling', 'stateless', 'container', 'k8s', 'kubernetes', 'orchestrator'])
    );
    if (noScalingPath.length > 0) {
      results.push(rule('P-01', 'pro', false, 'medium',
        `${noScalingPath.length} compute node(s) have no documented horizontal scaling path. Add scaling strategy to node metadata.`,
        noScalingPath.map((n) => n.id)));
    } else {
      results.push(rule('P-01', 'pro', true, 'medium',
        'All compute nodes document a horizontal scaling path.'));
    }
  })();

  // P-02 · Database Sharding Strategy Valid
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    const shardedDbs = dbs.filter((n) =>
      nodeHasKeyword(n, ['shard', 'sharding', 'partition', 'partitioning'])
    );
    if (shardedDbs.length === 0) {
      results.push(rule('P-02', 'pro', null, 'low', 'No sharded databases found.'));
      return;
    }
    const badShardKey = shardedDbs.filter((n) =>
      nodeHasKeyword(n, ['sequential id', 'auto-increment shard', 'country shard', 'status shard', 'low cardinality'])
    );
    const noShardKey = shardedDbs.filter((n) =>
      !nodeHasKeyword(n, ['shard key', 'partition key', 'user id', 'tenant id', 'hash', 'consistent hash'])
    );
    if (badShardKey.length > 0) {
      results.push(rule('P-02', 'pro', false, 'high',
        `${badShardKey.length} database(s) use a low-cardinality shard key (sequential ID, country, status). This creates hot shards.`,
        badShardKey.map((n) => n.id)));
    } else if (noShardKey.length > 0) {
      results.push(rule('P-02', 'pro', false, 'medium',
        `${noShardKey.length} sharded database(s) do not specify a shard key. Document the shard key in metadata.`,
        noShardKey.map((n) => n.id)));
    } else {
      results.push(rule('P-02', 'pro', true, 'medium',
        'Sharded databases specify valid, high-cardinality shard keys.'));
    }
  })();

  // P-03 · Read/Write Ratio Influences Architecture
  (() => {
    const goalText = `${sysm.goal || ''} ${sysm.constraints || ''}`.toLowerCase();
    const isReadHeavy = hasKeyword(goalText, ['read-heavy', 'read heavy', '>80% read', '80% read', 'mostly reads']);
    const isWriteHeavy = hasKeyword(goalText, ['write-heavy', 'write heavy', '>80% write', 'high ingest', 'high write', 'append-only']);
    const hasReadReplica = hasNodeType(nodes, REPLICATION_TYPES) ||
      nodesOfType(nodes, DB_TYPES).some((n) => nodeHasKeyword(n, ['read replica', 'replica', 'follower']));
    const hasWriteBuffer = hasNodeType(nodes, QUEUE_TYPES) ||
      nodesOfType(nodes, DB_TYPES).some((n) => nodeHasKeyword(n, ['lsm', 'write buffer', 'write-optimized', 'cassandra', 'scylladb', 'timescale']));

    if (!isReadHeavy && !isWriteHeavy) {
      results.push(rule('P-03', 'pro', null, 'low',
        'Read/write ratio not stated in system metadata. Add ratio information to validate architecture choices.'));
      return;
    }
    if (isReadHeavy && !hasReadReplica && !hasNodeType(nodes, CACHE_TYPES)) {
      results.push(rule('P-03', 'pro', false, 'high',
        'System is described as read-heavy but has no read replicas or caching layer. Add read replicas and aggressive caching.'));
    } else if (isWriteHeavy && !hasWriteBuffer) {
      results.push(rule('P-03', 'pro', false, 'high',
        'System is described as write-heavy but has no write buffer, queue, or write-optimized storage. Add a message queue as the ingestion layer.'));
    } else {
      results.push(rule('P-03', 'pro', true, 'medium',
        'Architecture aligns with the stated read/write ratio.'));
    }
  })();

  // P-04 · Rate Limiting Strategy
  (() => {
    const hasPublic = hasNodeType(nodes, EXTERNAL_TYPES);
    if (!hasPublic) {
      results.push(rule('P-04', 'pro', null, 'low', 'No public entry point. Rate limiting rule does not apply.'));
      return;
    }
    const allMeta = `${nodes.map((n) => meta(n)).join(' ')} ${sysm.constraints || ''}`.toLowerCase();
    const hasRateLimit = hasKeyword(allMeta, [
      'rate limit', 'rate limiting', 'rate-limit', 'token bucket', 'leaky bucket',
      'sliding window', 'throttle', 'throttling',
    ]);
    const rateLimitAtGateway = nodes
      .filter((n) => n.type === 'API_GATEWAY' || n.type === 'WEB_APPLICATION_FIREWALL')
      .some((n) => nodeHasKeyword(n, ['rate limit', 'rate-limit', 'throttle', 'token bucket', 'sliding window']));

    if (!hasRateLimit) {
      results.push(rule('P-04', 'pro', false, 'medium',
        'No rate limiting strategy found for a public-facing system. Add token bucket/sliding window rate limiting at the API Gateway.'));
    } else if (hasRateLimit && !rateLimitAtGateway) {
      results.push(rule('P-04', 'pro', false, 'medium',
        'Rate limiting is mentioned but not attributed to the API Gateway or WAF. Rate limiting must be enforced at the entry layer, not inside business logic.'));
    } else {
      results.push(rule('P-04', 'pro', true, 'medium',
        'Rate limiting strategy is defined at the gateway layer.'));
    }
  })();

  // P-05 · Latency Budget Allocated
  (() => {
    const constraints = (sysm.constraints || '').toLowerCase();
    const hasSLA = hasKeyword(constraints, ['latency', 'p99', 'p95', 'p50', 'ms', 'millisecond', 'sla', 'response time']);
    if (!hasSLA) {
      results.push(rule('P-05', 'pro', null, 'low',
        'No latency SLA stated in system constraints.'));
      return;
    }
    const allMeta = nodes.map((n) => meta(n)).join(' ').toLowerCase();
    const hasBudget = hasKeyword(allMeta, ['latency budget', 'p99', 'p95', 'ms budget', 'network', 'db query', 'cache lookup']) ||
      (constraints.match(/\d+ms/g) || []).length >= 2;
    if (!hasBudget) {
      results.push(rule('P-05', 'pro', false, 'medium',
        'Latency SLA is stated but the budget is not allocated across components (network, DB, cache, compute). Add per-component latency budgets to node metadata.'));
    } else {
      results.push(rule('P-05', 'pro', true, 'medium',
        'Latency budget is allocated across system components.'));
    }
  })();

  // P-06 · Connection Pooling
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    const compute = nodesOfType(nodes, COMPUTE_TYPES);
    if (dbs.length === 0 || compute.length === 0) {
      results.push(rule('P-06', 'pro', null, 'low', 'No DB-to-compute connection to evaluate connection pooling.'));
      return;
    }
    const allMeta = [...dbs, ...compute].map((n) => meta(n)).join(' ');
    const hasPooling = hasKeyword(allMeta, [
      'connection pool', 'connection pooling', 'pgbouncer', 'hikari', 'c3p0', 'pool size', 'max connections',
    ]);
    if (!hasPooling) {
      results.push(rule('P-06', 'pro', false, 'medium',
        'No connection pooling strategy documented between compute and database layers. Add connection pool details to application or DB node metadata.'));
    } else {
      results.push(rule('P-06', 'pro', true, 'medium',
        'Connection pooling is documented.'));
    }
  })();

  // P-07 · Async Processing for Non-Critical Path
  (() => {
    const syncToWorker = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && !isAsync(e) && WORKER_TYPES.has(tgt.type);
    });
    const nonCriticalOnSync = edges.filter((e) => {
      const tgt = nodeMap.get(e.target);
      return tgt && !isAsync(e) &&
        nodeHasKeyword(tgt, ['email', 'notification', 'analytics', 'analytics event', 'image processing', 'resize', 'pdf', 'report']);
    });

    if (syncToWorker.length > 0 || nonCriticalOnSync.length > 0) {
      const affected = [
        ...syncToWorker.map(e => e.target),
        ...nonCriticalOnSync.map(e => e.target),
      ];
      results.push(rule('P-07', 'pro', false, 'high',
        'Non-critical path operations (email, notifications, analytics, image processing) are on synchronous paths. Offload these to an async queue.',
        [...new Set(affected)],
        [...syncToWorker, ...nonCriticalOnSync].map(e => e.id)));
    } else {
      results.push(rule('P-07', 'pro', true, 'medium',
        'Non-critical path operations appear to be asynchronously processed or are not present.'));
    }
  })();

  // P-08 · Consistency Model Declared
  (() => {
    const dbs = nodesOfType(nodes, DB_TYPES);
    if (dbs.length === 0) {
      results.push(rule('P-08', 'pro', null, 'low', 'No databases found.'));
      return;
    }
    const missing = dbs.filter((n) =>
      !nodeHasKeyword(n, [
        'strong consistency', 'eventual consistency', 'read-your-writes', 'monotonic',
        'causal consistency', 'linearizable', 'serializability', 'acid', 'base',
      ])
    );
    if (missing.length > 0) {
      results.push(rule('P-08', 'pro', false, 'medium',
        `${missing.length} data store(s) do not declare a consistency model. Each store must state: strong, eventual, read-your-writes, or causal consistency.`,
        missing.map((n) => n.id)));
    } else {
      results.push(rule('P-08', 'pro', true, 'medium',
        'All data stores declare their consistency model.'));
    }
  })();

  // P-09 · CAP Theorem Trade-off Acknowledged
  (() => {
    const distributedDbs = nodesOfType(nodes, DB_TYPES).filter((n) =>
      nodeHasKeyword(n, ['distributed', 'cluster', 'shard', 'replica', 'cassandra', 'dynamodb', 'mongodb', 'cockroach'])
    );
    if (distributedDbs.length === 0) {
      results.push(rule('P-09', 'pro', null, 'low',
        'No distributed data stores identified. CAP theorem rule applies to distributed databases only.'));
      return;
    }
    const missing = distributedDbs.filter((n) =>
      !nodeHasKeyword(n, ['cp', 'ap', 'cap', 'partition', 'availability', 'consistency trade', 'network partition'])
    );
    if (missing.length > 0) {
      results.push(rule('P-09', 'pro', false, 'medium',
        `${missing.length} distributed data store(s) do not acknowledge their CAP trade-off (CP vs AP). Document partition behavior in metadata.`,
        missing.map((n) => n.id)));
    } else {
      results.push(rule('P-09', 'pro', true, 'medium',
        'CAP theorem trade-offs are acknowledged for distributed stores.'));
    }
  })();

  // P-10 · Distributed Transaction Handling
  (() => {
    // Look for compute nodes that have outgoing edges to more than one distinct DB
    const multiDbWrites = nodes.filter((n) => {
      if (!COMPUTE_TYPES.has(n.type)) return false;
      const targets = (outgoing.get(n.id) || []).map(e => nodeMap.get(e.target)).filter(Boolean);
      const dbTargets = targets.filter((t) => DB_TYPES.has(t.type));
      return dbTargets.length >= 2;
    });
    if (multiDbWrites.length === 0) {
      results.push(rule('P-10', 'pro', null, 'low',
        'No compute node found writing to multiple data stores. Distributed transaction rule does not apply.'));
      return;
    }
    const missing = multiDbWrites.filter((n) =>
      !nodeHasKeyword(n, ['saga', 'two-phase', '2pc', 'outbox', 'compensating transaction', 'distributed transaction'])
    );
    if (missing.length > 0) {
      results.push(rule('P-10', 'pro', false, 'high',
        `${missing.length} service(s) write to multiple data stores without a documented coordination mechanism (Saga, 2PC, Outbox pattern).`,
        missing.map((n) => n.id)));
    } else {
      results.push(rule('P-10', 'pro', true, 'medium',
        'Distributed transaction handling is documented for multi-store write operations.'));
    }
  })();

  // P-11 · Idempotent Message Consumer
  (() => {
    const consumerEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && QUEUE_TYPES.has(src.type) && COMPUTE_TYPES.has(tgt.type);
    });
    if (consumerEdges.length === 0) {
      results.push(rule('P-11', 'pro', null, 'low', 'No message queue consumers found.'));
      return;
    }
    const nonIdempotent = consumerEdges.filter((e) => {
      const tgt = nodeMap.get(e.target);
      return !nodeHasKeyword(tgt, ['idempotent', 'idempotency', 'dedupe', 'deduplication', 'exactly once', 'at least once']);
    });
    if (nonIdempotent.length > 0) {
      results.push(rule('P-11', 'pro', false, 'high',
        `${nonIdempotent.length} message consumer(s) do not document idempotency. Duplicate delivery will cause duplicate side effects.`,
        nonIdempotent.map(e => e.target),
        nonIdempotent.map(e => e.id)));
    } else {
      results.push(rule('P-11', 'pro', true, 'medium',
        'All message consumers document idempotency handling.'));
    }
  })();

  // P-12 · Dead Letter Queue
  (() => {
    const queues = nodesOfType(nodes, QUEUE_TYPES);
    if (queues.length === 0) {
      results.push(rule('P-12', 'pro', null, 'low', 'No message queues found.'));
      return;
    }
    const missing = queues.filter((n) =>
      !nodeHasKeyword(n, ['dlq', 'dead letter', 'dead-letter', 'failure capture', 'retry limit', 'poison message'])
    );
    if (missing.length > 0) {
      results.push(rule('P-12', 'pro', false, 'medium',
        `${missing.length} message queue(s) have no Dead Letter Queue (DLQ) documented. Failed messages must not be silently dropped.`,
        missing.map((n) => n.id)));
    } else {
      results.push(rule('P-12', 'pro', true, 'medium',
        'All message queues document a DLQ or failure capture mechanism.'));
    }
  })();

  // P-13 · Consensus for Leader Election
  (() => {
    const needsLeader = nodes.some((n) =>
      nodeHasKeyword(n, ['primary', 'leader', 'master', 'coordinator', 'lock', 'distributed lock'])
    );
    if (!needsLeader) {
      results.push(rule('P-13', 'pro', null, 'low',
        'No leader election or distributed lock patterns identified.'));
      return;
    }
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasConsensus = hasKeyword(allMeta, [
      'zookeeper', 'etcd', 'raft', 'paxos', 'consensus', 'leader election',
      'distributed lock', 'redlock',
    ]);
    if (!hasConsensus) {
      results.push(rule('P-13', 'pro', false, 'medium',
        'Components reference primary/leader/coordinator roles but no consensus mechanism is documented (ZooKeeper, etcd, Raft). This is a split-brain risk.'));
    } else {
      results.push(rule('P-13', 'pro', true, 'medium',
        'Consensus mechanism for leader election is documented.'));
    }
  })();

  // P-14 · Partitioning Does Not Break Query Patterns
  (() => {
    const shardedDbs = nodesOfType(nodes, DB_TYPES).filter((n) =>
      nodeHasKeyword(n, ['shard', 'sharding', 'partition'])
    );
    if (shardedDbs.length === 0) {
      results.push(rule('P-14', 'pro', null, 'low', 'No sharded databases found.'));
      return;
    }
    const scatterGather = shardedDbs.filter((n) =>
      nodeHasKeyword(n, ['scatter', 'scatter-gather', 'fan-out', 'cross-shard query', 'full scan', 'range query across shards'])
    );
    const queryValidated = shardedDbs.filter((n) =>
      nodeHasKeyword(n, ['query pattern', 'access pattern', 'shard key query', 'all queries use shard key'])
    );
    if (scatterGather.length > 0) {
      results.push(rule('P-14', 'pro', false, 'high',
        `${scatterGather.length} sharded database(s) acknowledge scatter-gather queries. Common operations should not cross all shards.`,
        scatterGather.map((n) => n.id)));
    } else if (queryValidated.length < shardedDbs.length) {
      results.push(rule('P-14', 'pro', false, 'low',
        `${shardedDbs.length - queryValidated.length} sharded database(s) do not document that query patterns are compatible with the shard key. Verify all queries use the shard key.`,
        shardedDbs.map((n) => n.id)));
    } else {
      results.push(rule('P-14', 'pro', true, 'medium',
        'Query patterns are documented as compatible with the sharding strategy.'));
    }
  })();

  // P-15 · Circuit Breaker on External Calls
  (() => {
    const externalEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && (COMPUTE_TYPES.has(src.type)) &&
        (tgt.type === 'EXTERNAL_SERVICE' || DB_TYPES.has(tgt.type) || QUEUE_TYPES.has(tgt.type));
    });
    if (externalEdges.length === 0) {
      results.push(rule('P-15', 'pro', null, 'low', 'No outgoing calls to external or downstream dependencies found.'));
      return;
    }
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasCircuitBreaker = hasKeyword(allMeta, ['circuit breaker', 'circuit-breaker', 'hystrix', 'resilience4j', 'sentinel', 'open state', 'fallback response']);
    if (!hasCircuitBreaker) {
      results.push(rule('P-15', 'pro', false, 'medium',
        'Synchronous calls to external/downstream services exist but no circuit breaker pattern is documented. Cascading failures are a risk.'));
    } else {
      results.push(rule('P-15', 'pro', true, 'medium',
        'Circuit breaker pattern is documented for downstream calls.'));
    }
  })();

  // P-16 · Retry with Exponential Backoff
  (() => {
    const interServiceEdges = edges.filter((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && COMPUTE_TYPES.has(src.type) && !isAsync(e);
    });
    if (interServiceEdges.length === 0) {
      results.push(rule('P-16', 'pro', null, 'low', 'No synchronous internal calls found.'));
      return;
    }
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasRetry = hasKeyword(allMeta, ['retry', 'retries', 'exponential backoff', 'backoff', 'jitter']);
    const hasFixedRetry = hasKeyword(allMeta, ['fixed retry', 'fixed interval retry', 'immediate retry']);
    if (!hasRetry) {
      results.push(rule('P-16', 'pro', false, 'medium',
        'No retry strategy documented for inter-service calls. All network calls must implement exponential backoff with jitter.'));
    } else if (hasFixedRetry) {
      results.push(rule('P-16', 'pro', false, 'medium',
        'Fixed-interval or immediate retry strategy found. This causes thundering herd. Use exponential backoff with jitter.'));
    } else {
      results.push(rule('P-16', 'pro', true, 'medium',
        'Exponential backoff retry strategy is documented.'));
    }
  })();

  // P-17 · Availability SLA Matched to Architecture
  (() => {
    const constraints = (sysm.constraints || '').toLowerCase();
    const has4Nine = hasKeyword(constraints, ['99.99%', '4 nines', 'four nines']);
    const has3Nine = hasKeyword(constraints, ['99.9%', '3 nines', 'three nines']);
    const hasMultiRegion = nodes.some((n) =>
      nodeHasKeyword(n, ['multi-region', 'active-active', 'global', 'region'])
    );
    const hasMultiAZ = nodes.some((n) =>
      nodeHasKeyword(n, ['multi-az', 'availability zone', 'az', 'zone'])
    );

    if (!has4Nine && !has3Nine) {
      results.push(rule('P-17', 'pro', null, 'low',
        'No availability SLA stated in system constraints. Add an availability target (e.g. 99.9%) to validate architecture.'));
      return;
    }
    if (has4Nine && !hasMultiRegion) {
      results.push(rule('P-17', 'pro', false, 'high',
        '99.99% SLA requires multi-region active-active deployment. The current architecture does not show multi-region setup.'));
    } else if (has3Nine && !hasMultiAZ && !hasMultiRegion) {
      results.push(rule('P-17', 'pro', false, 'high',
        '99.9% SLA requires at least multi-AZ deployment. The current architecture does not show multi-AZ or multi-region setup.'));
    } else {
      results.push(rule('P-17', 'pro', true, 'medium',
        'Availability SLA is consistent with the architecture.'));
    }
  })();

  // P-18 · Graceful Degradation Path
  (() => {
    const nonCritical = nodes.filter((n) =>
      nodeHasKeyword(n, ['recommendation', 'analytics', 'notification', 'non-critical', 'optional feature'])
    );
    if (nonCritical.length === 0) {
      results.push(rule('P-18', 'pro', null, 'low',
        'No non-critical features identified. Add metadata to mark optional features and their degradation behavior.'));
      return;
    }
    const missing = nonCritical.filter((n) =>
      !nodeHasKeyword(n, ['fallback', 'graceful degradation', 'stale data', 'default response', 'feature flag', 'disabled'])
    );
    if (missing.length > 0) {
      results.push(rule('P-18', 'pro', false, 'medium',
        `${missing.length} non-critical feature(s) have no documented graceful degradation strategy.`,
        missing.map((n) => n.id)));
    } else {
      results.push(rule('P-18', 'pro', true, 'medium',
        'Graceful degradation paths are documented for non-critical features.'));
    }
  })();

  // P-19 · Health Check and Auto-Recovery
  (() => {
    const compute = nodesOfType(nodes, COMPUTE_TYPES);
    if (compute.length === 0) {
      results.push(rule('P-19', 'pro', null, 'low', 'No compute nodes.'));
      return;
    }
    const hasOrchestrator = nodes.some((n) => n.type === 'ORCHESTRATOR');
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasHealthCheck = hasKeyword(allMeta, [
      'health check', 'healthcheck', '/health', 'liveness', 'readiness', 'heartbeat',
    ]);
    const hasAutoRecovery = hasOrchestrator ||
      hasKeyword(allMeta, ['auto-healing', 'auto healing', 'self-healing', 'restart policy', 'kubernetes', 'k8s', 'ecs']);

    if (!hasHealthCheck) {
      results.push(rule('P-19', 'pro', false, 'medium',
        'No health check endpoints documented on compute services. Load balancers and orchestrators require health endpoints to route traffic correctly.'));
    } else if (!hasAutoRecovery) {
      results.push(rule('P-19', 'pro', false, 'medium',
        'Health checks are documented but no auto-recovery mechanism is present (Orchestrator, Kubernetes, ECS restart policy).'));
    } else {
      results.push(rule('P-19', 'pro', true, 'medium',
        'Health checks and auto-recovery mechanisms are present.'));
    }
  })();

  // P-20 · Event Sourcing Snapshot Strategy
  (() => {
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasEventSourcing = hasKeyword(allMeta, ['event sourcing', 'event-sourcing', 'event store', 'append-only log']);
    if (!hasEventSourcing) {
      results.push(rule('P-20', 'pro', null, 'low', 'Event sourcing not detected in this design.'));
      return;
    }
    const hasSnapshot = hasKeyword(allMeta, ['snapshot', 'snapshotting', 'aggregate snapshot']);
    if (!hasSnapshot) {
      results.push(rule('P-20', 'pro', false, 'medium',
        'Event sourcing is used but no snapshotting strategy is documented. Replaying an unbounded event log is a performance fault.'));
    } else {
      results.push(rule('P-20', 'pro', true, 'medium',
        'Event sourcing snapshot strategy is documented.'));
    }
  })();

  // P-21 · CQRS Models Are Separate
  (() => {
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasCQRS = hasKeyword(allMeta, ['cqrs', 'command query', 'command model', 'query model']);
    if (!hasCQRS) {
      results.push(rule('P-21', 'pro', null, 'low', 'CQRS pattern not detected.'));
      return;
    }
    const hasReadStore = nodes.some((n) => nodeHasKeyword(n, ['read model', 'query store', 'read store', 'read side']));
    const hasWriteStore = nodes.some((n) => nodeHasKeyword(n, ['write model', 'command store', 'write store', 'write side']));
    if (!hasReadStore || !hasWriteStore) {
      results.push(rule('P-21', 'pro', false, 'high',
        'CQRS is referenced but separate read and write data models are not both present in the design. Sharing one store negates CQRS benefits.'));
    } else {
      results.push(rule('P-21', 'pro', true, 'medium',
        'CQRS read and write models are physically separated.'));
    }
  })();

  // P-22 · Search Index is Not Primary Store
  (() => {
    const searchNodes = nodesOfType(nodes, SEARCH_TYPES);
    if (searchNodes.length === 0) {
      results.push(rule('P-22', 'pro', null, 'low', 'No search engine found.'));
      return;
    }
    // Bad: compute writes directly to search engine without going through a primary DB
    const directWrite = edges.some((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src && tgt && COMPUTE_TYPES.has(src.type) && SEARCH_TYPES.has(tgt.type) &&
        !edges.some((oe) => oe.source === e.source && DB_TYPES.has(nodeMap.get(oe.target)?.type));
    });
    const treatedAsPrimary = searchNodes.some((n) =>
      nodeHasKeyword(n, ['primary store', 'authoritative', 'source of truth'])
    );
    if (directWrite || treatedAsPrimary) {
      results.push(rule('P-22', 'pro', false, 'high',
        'Search engine appears to be used as the primary data store. Writes must go to the primary store first; the search index is a derived read index.',
        searchNodes.map((n) => n.id)));
    } else {
      results.push(rule('P-22', 'pro', true, 'medium',
        'Search engine is used as a derived index, not the primary store.'));
    }
  })();

  // P-23 · Time-Series Data Uses Appropriate Storage
  (() => {
    const allMeta = `${sysm.goal || ''} ${nodes.map((n) => meta(n)).join(' ')}`.toLowerCase();
    const hasTimeSeries = hasKeyword(allMeta, [
      'time-series', 'time series', 'metrics', 'telemetry', 'iot', 'sensor', 'append-only', 'time-ordered',
    ]);
    if (!hasTimeSeries) {
      results.push(rule('P-23', 'pro', null, 'low', 'No time-series workload detected.'));
      return;
    }
    const hasTimeSeriesDB = hasNodeType(nodes, new Set(['TIME_SERIES_DATABASE']));
    const hasAppropriateStore = hasTimeSeriesDB ||
      nodesOfType(nodes, DB_TYPES).some((n) =>
        nodeHasKeyword(n, ['influx', 'timescaledb', 'prometheus', 'clickhouse', 'druid', 'pinot'])
      );
    if (!hasAppropriateStore) {
      results.push(rule('P-23', 'pro', false, 'high',
        'Time-series workload detected but no time-series database is used. Storing high-volume time-ordered data in a relational DB is a write scalability risk.'));
    } else {
      results.push(rule('P-23', 'pro', true, 'high',
        'Time-series data uses an appropriate time-series store.'));
    }
  })();

  // P-24 · Object Storage for Binary Assets
  (() => {
    const allMeta = `${sysm.goal || ''} ${nodes.map((n) => meta(n)).join(' ')}`.toLowerCase();
    const hasBinary = hasKeyword(allMeta, ['image', 'video', 'file upload', 'document', 'blob', 'binary', 'media', 'attachment', 'backup', 'asset']);
    if (!hasBinary) {
      results.push(rule('P-24', 'pro', null, 'low', 'No binary asset workload detected.'));
      return;
    }
    const hasObjectStorage = hasNodeType(nodes, new Set(['OBJECT_STORAGE'])) ||
      nodesOfType(nodes, DB_TYPES).some((n) =>
        nodeHasKeyword(n, ['s3', 'gcs', 'azure blob', 'minio', 'object store', 'object storage'])
      );
    const storedInRelational = nodesOfType(nodes, new Set(['RELATIONAL_DATABASE'])).some((n) =>
      nodeHasKeyword(n, ['blob', 'binary', 'image stored', 'file stored', 'bytea', 'mediumblob'])
    );
    if (storedInRelational) {
      results.push(rule('P-24', 'pro', false, 'high',
        'Binary assets are stored in a relational database. This is a scalability and cost fault. Use object storage (S3-compatible).'));
    } else if (!hasObjectStorage) {
      results.push(rule('P-24', 'pro', false, 'medium',
        'Binary asset workload detected but no object storage is modeled. Add an Object Storage node.'));
    } else {
      results.push(rule('P-24', 'pro', true, 'high',
        'Binary assets are routed to object storage.'));
    }
  })();

  // P-25 · Secrets Management
  (() => {
    const compute = nodesOfType(nodes, COMPUTE_TYPES);
    if (compute.length === 0) {
      results.push(rule('P-25', 'pro', null, 'low', 'No compute nodes.'));
      return;
    }
    const exposedSecrets = compute.filter((n) =>
      nodeHasKeyword(n, ['password', 'api key', 'secret', 'credential', 'token', 'private key', 'env var'])
    );
    const hasSecretsManager = hasNodeType(nodes, SECRETS_TYPES) ||
      compute.some((n) => nodeHasKeyword(n, ['vault', 'aws secrets manager', 'gcp secret manager', 'secrets manager', 'azure key vault']));
    if (exposedSecrets.length > 0 && !hasSecretsManager) {
      results.push(rule('P-25', 'pro', false, 'high',
        `${exposedSecrets.length} compute node(s) reference credentials without a Secrets Manager. This is a critical security fault.`,
        exposedSecrets.map((n) => n.id)));
    } else if (!hasSecretsManager) {
      results.push(rule('P-25', 'pro', false, 'low',
        'No Secrets Manager present. Add one to ensure credentials are not hardcoded or stored in environment variables.'));
    } else {
      results.push(rule('P-25', 'pro', true, 'medium',
        'Secrets management is handled by a dedicated secrets manager.'));
    }
  })();

  // P-26 · Encryption at Rest and in Transit
  (() => {
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasPII = hasKeyword(allMeta, ['pii', 'personal data', 'user data', 'email address', 'phone number', 'payment', 'credit card', 'health data']);
    if (!hasPII) {
      results.push(rule('P-26', 'pro', null, 'low',
        'No PII or sensitive data detected in metadata. Manually verify encryption requirements.'));
      return;
    }
    const hasEncryption = hasKeyword(allMeta, ['tls', 'https', 'encrypt', 'aes-256', 'aes 256', 'at rest', 'in transit', 'ssl', 'mtls']);
    if (!hasEncryption) {
      results.push(rule('P-26', 'pro', false, 'high',
        'System processes sensitive/PII data but no encryption at rest or in transit is documented. This is a compliance failure.'));
    } else {
      results.push(rule('P-26', 'pro', true, 'medium',
        'Encryption at rest and in transit is documented for sensitive data.'));
    }
  })();

  // P-27 · AuthN and AuthZ Are Separate Components
  (() => {
    const hasAuthn = nodes.some((n) => n.type === 'AUTHENTICATION_SERVICE');
    const hasAuthz = nodes.some((n) =>
      n.type === 'AUTHORIZATION_SERVICE' || n.type === 'POLICY_ENGINE' || n.type === 'ACCESS_CONTROL_SYSTEM'
    );
    const hasGatewayOnly = !hasAuthn && !hasAuthz && nodes.some((n) => n.type === 'API_GATEWAY');
    const hasBothInOne = nodes.some((n) =>
      n.type === 'AUTHENTICATION_SERVICE' &&
      nodeHasKeyword(n, ['permission', 'role', 'authorize', 'authz', 'access control'])
    );
    const hasPublic = hasNodeType(nodes, EXTERNAL_TYPES);

    if (!hasPublic) {
      results.push(rule('P-27', 'pro', null, 'low', 'No public entry point. AuthN/AuthZ separation rule is advisory.'));
      return;
    }
    if (!hasAuthn && !hasAuthz && !hasGatewayOnly) {
      results.push(rule('P-27', 'pro', false, 'medium',
        'Neither authentication nor authorization component is present. Both must be modeled for public-facing systems.'));
    } else if (hasBothInOne) {
      results.push(rule('P-27', 'pro', false, 'medium',
        'Authentication service appears to also handle authorization. These must be separate components for consistent permissions at scale.'));
    } else if (hasAuthn && !hasAuthz) {
      results.push(rule('P-27', 'pro', false, 'medium',
        'Authentication is modeled but no separate Authorization/Policy component exists. Authorization logic embedded in individual services is inconsistent at scale.'));
    } else {
      results.push(rule('P-27', 'pro', true, 'medium',
        'Authentication and authorization are handled by separate components.'));
    }
  })();

  // P-28 · PII Data Access Is Audited
  (() => {
    const allMeta = nodes.map((n) => meta(n)).join(' ');
    const hasPII = hasKeyword(allMeta, ['pii', 'personal data', 'user data', 'gdpr', 'hipaa', 'health data', 'payment data']);
    if (!hasPII) {
      results.push(rule('P-28', 'pro', null, 'low', 'No PII stores identified.'));
      return;
    }
    const hasAuditLog = hasNodeType(nodes, AUDIT_TYPES) ||
      hasKeyword(allMeta, ['audit log', 'audit trail', 'access log', 'data access log']);
    if (!hasAuditLog) {
      results.push(rule('P-28', 'pro', false, 'high',
        'System stores PII but no audit log for data access is present. This is a regulatory compliance gap (GDPR, HIPAA).'));
    } else {
      results.push(rule('P-28', 'pro', true, 'medium',
        'PII data access audit logging is present.'));
    }
  })();

  // P-29 · Three Pillars of Observability
  (() => {
    const compute = nodesOfType(nodes, COMPUTE_TYPES);
    if (compute.length === 0) {
      results.push(rule('P-29', 'pro', null, 'low', 'No compute nodes to observe.'));
      return;
    }
    const hasLogs = nodes.some((n) => n.type === 'LOGGING_SYSTEM');
    const hasMetrics = nodes.some((n) => n.type === 'METRICS_SYSTEM');
    const hasTracing = nodes.some((n) => n.type === 'TRACING_SYSTEM');
    const missing = [];
    if (!hasLogs) missing.push('Logging');
    if (!hasMetrics) missing.push('Metrics');
    if (!hasTracing) missing.push('Tracing');

    if (missing.length > 0) {
      results.push(rule('P-29', 'pro', false, 'high',
        `Missing observability pillar(s): ${missing.join(', ')}. All three pillars (logs, metrics, traces) are required.`));
    } else {
      results.push(rule('P-29', 'pro', true, 'high',
        'All three observability pillars are present: logging, metrics, and tracing.'));
    }
  })();

  // P-30 · Alerting Tied to SLOs
  (() => {
    const hasAlerting = nodes.some((n) => n.type === 'ALERTING_SYSTEM');
    if (!hasAlerting) {
      results.push(rule('P-30', 'pro', false, 'medium',
        'No alerting system present. Alerting must be modeled and tied to SLO burn rates.'));
      return;
    }
    const alertingNode = nodes.find((n) => n.type === 'ALERTING_SYSTEM');
    const hasSLO = nodeHasKeyword(alertingNode, ['slo', 'sli', 'burn rate', 'error budget', 'service level objective']);
    const hasThresholdOnly = nodeHasKeyword(alertingNode, ['cpu > 80', 'cpu 80%', 'error count', 'threshold only', 'raw threshold']);
    if (hasThresholdOnly && !hasSLO) {
      results.push(rule('P-30', 'pro', false, 'medium',
        'Alerting system only uses raw metric thresholds (CPU, error count). Alerts must be tied to SLO burn rates to avoid alert fatigue.',
        [alertingNode.id]));
    } else if (!hasSLO) {
      results.push(rule('P-30', 'pro', false, 'low',
        'Alerting system is present but does not document SLO-based alerting. Add SLO/burn rate information to the alerting node.',
        [alertingNode.id]));
    } else {
      results.push(rule('P-30', 'pro', true, 'medium',
        'Alerting is tied to SLO burn rates.'));
    }
  })();

  return results.filter((item) => isRuleApplicableForTier(item.ruleTier, workspaceTier));
}

// ─── Score summary ────────────────────────────────────────────────────────────

export function summarizeResults(results) {
  const applicable = results.filter((r) => r.passed !== null);
  const passed = applicable.filter((r) => r.passed === true);
  const failed = applicable.filter((r) => r.passed === false);
  const basic = results.filter((r) => r.ruleTier === 'basic');
  const pro = results.filter((r) => r.ruleTier === 'pro');
  const enterprise = results.filter((r) => r.ruleTier === 'enterprise');

  return {
    total: results.length,
    applicable: applicable.length,
    passed: passed.length,
    failed: failed.length,
    skipped: results.length - applicable.length,
    score: applicable.length > 0 ? Math.round((passed.length / applicable.length) * 100) : 0,
    byRuleTier: {
      basic: {
        total: basic.length,
        passed: basic.filter((r) => r.passed === true).length,
        failed: basic.filter((r) => r.passed === false).length,
      },
      pro: {
        total: pro.length,
        passed: pro.filter((r) => r.passed === true).length,
        failed: pro.filter((r) => r.passed === false).length,
      },
      enterprise: {
        total: enterprise.length,
        passed: enterprise.filter((r) => r.passed === true).length,
        failed: enterprise.filter((r) => r.passed === false).length,
      },
    },
    failedRules: failed.map((r) => ({ id: r.id, ruleTier: r.ruleTier, reason: r.reason, confidence: r.confidence })),
  };
}

// ─── Gemini prompt builder ────────────────────────────────────────────────────

export function buildGeminiPrompt(results, systemMetadata, workspaceTier = 'core') {
  const summary = summarizeResults(results);
  const failedRules = results.filter((r) => r.passed === false);
  const passedRules = results.filter((r) => r.passed === true);
  const coreTierNote = workspaceTier === 'core'
    ? 'Note: Only Basic tier rules (F-01 to F-20) were evaluated for this workspace. Do NOT reference Pro or Enterprise rules in your suggestions.'
    : '';

  const failedList = failedRules
    .map((r) => `- [${r.id}] (confidence: ${r.confidence}): ${r.reason}`)
    .join('\n');

  const passedList = passedRules
    .map((r) => `- [${r.id}]: ${r.reason}`)
    .join('\n');

  return `You are a principal architecture auditor at Structra.
Produce a structured, professional, litigation-grade technical evaluation report.
The report must be detailed, specific, and decision-ready.

SYSTEM GOAL:
${systemMetadata?.goal || 'Not stated'}

ASSUMPTIONS:
${(systemMetadata?.assumptions || []).join('\n') || 'None stated'}

CONSTRAINTS:
${systemMetadata?.constraints || 'Not stated'}

EVALUATION SCORE:
${summary.score}% (${summary.passed}/${summary.applicable} applicable rules passed)

FAILED RULES:
${failedList || 'None — all applicable rules passed.'}

PASSING RULES (for context):
${passedList || 'None'}

REPORT FORMAT REQUIREMENTS (MANDATORY):
1. Output valid Markdown only.
2. Start with this title line before all sections:
   # Structra Architecture Evaluation Report
3. Use exactly these sections in this order:
   - ## Executive Summary
   - ## Risk Register
   - ## Findings By Domain
   - ## Remediation Roadmap
   - ## Verification Checklist
   - ## Overall Assessment
4. In "Risk Register", provide a table with columns:
   | Risk ID | Domain | Severity | Evidence | Business Impact | Recommended Fix |
5. In "Findings By Domain", create subsections:
   ### Connectivity
   ### Compute
   ### Data
   ### Security
   ### Reliability
   ### Observability
6. For each failed rule, include:
   - the concrete architecture gap,
   - why it matters for this specific system,
   - implementation-level remediation steps,
   - expected measurable outcome after remediation.
7. In "Remediation Roadmap", provide phases:
   - Immediate (0-2 weeks)
   - Near-term (2-6 weeks)
   - Mid-term (6-12 weeks)
   Within each phase, use hierarchical numeric action numbering:
   - top-level actions as 1., 2., 3.
   - sub-actions as 1.1., 1.2., 2.1.
   - each sub-action should be implementation-specific and measurable.
8. In "Verification Checklist", provide actionable markdown checkboxes with acceptance criteria using this exact syntax:
   - [ ] Item text...
9. Highlight key technical terms, components, protocols, metrics, rule IDs, and risk labels using inline code ticks, e.g. \`API Gateway\`, \`F-10\`, \`p95 latency\`.
10. Keep language precise and technical, avoid fluff.
11. Use concise bulleting, clear table evidence, and measurable acceptance criteria (SLO/SLA/threshold style where possible).
12. If system goal is unclear, explicitly state this as a material limitation.
${coreTierNote ? `13. ${coreTierNote}` : ''}

Do not output any preface or disclaimer. Output the report only.`;
}
