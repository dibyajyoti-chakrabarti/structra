const normalizeBoundIds = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    normalized.push(trimmed);
  });
  return normalized;
};

const getNodeWidth = (node) =>
  typeof node?.width === 'number' && Number.isFinite(node.width) ? node.width : 0;

const getNodeHeight = (node) =>
  typeof node?.height === 'number' && Number.isFinite(node.height) ? node.height : 0;

const toBoundRect = (bound) => {
  const width =
    typeof bound?.size?.width === 'number' && Number.isFinite(bound.size.width)
      ? bound.size.width
      : typeof bound?.width === 'number' && Number.isFinite(bound.width)
      ? bound.width
      : 0;
  const height =
    typeof bound?.size?.height === 'number' && Number.isFinite(bound.size.height)
      ? bound.size.height
      : typeof bound?.height === 'number' && Number.isFinite(bound.height)
      ? bound.height
      : 0;
  return {
    position: {
      x: typeof bound?.position?.x === 'number' && Number.isFinite(bound.position.x) ? bound.position.x : 0,
      y: typeof bound?.position?.y === 'number' && Number.isFinite(bound.position.y) ? bound.position.y : 0,
    },
    width,
    height,
  };
};

export const isNodeStrictlyInsideBound = (node, bound) => {
  if (!node || !bound) return false;
  const nodeWidth = getNodeWidth(node);
  const nodeHeight = getNodeHeight(node);
  const boundRect = toBoundRect(bound);
  return (
    node.position.x >= boundRect.position.x &&
    node.position.y >= boundRect.position.y &&
    node.position.x + nodeWidth <= boundRect.position.x + boundRect.width &&
    node.position.y + nodeHeight <= boundRect.position.y + boundRect.height
  );
};

export const reconcileBoundMembership = (canvasState, boundId) => {
  if (!canvasState || !boundId) return canvasState;
  const targetBound = (canvasState.boundsItems || []).find((item) => item.id === boundId);
  if (!targetBound || !Array.isArray(canvasState.nodes)) return canvasState;

  let hasChanged = false;
  const nodes = canvasState.nodes.map((node) => {
    const current = normalizeBoundIds(node?.bound_ids);
    const inside = isNodeStrictlyInsideBound(node, targetBound);
    const hasMembership = current.includes(boundId);
    if (inside && !hasMembership) {
      hasChanged = true;
      return { ...node, bound_ids: [...current, boundId] };
    }
    if (!inside && hasMembership) {
      hasChanged = true;
      return { ...node, bound_ids: current.filter((entry) => entry !== boundId) };
    }
    if (current.length !== (Array.isArray(node?.bound_ids) ? node.bound_ids.length : 0)) {
      hasChanged = true;
      return { ...node, bound_ids: current };
    }
    return node;
  });

  return hasChanged ? { ...canvasState, nodes } : canvasState;
};

export const reconcileNodeMembership = (canvasState, nodeId) => {
  if (!canvasState || !nodeId) return canvasState;
  const targetNode = (canvasState.nodes || []).find((node) => node.id === nodeId);
  if (!targetNode || !Array.isArray(canvasState.boundsItems)) return canvasState;

  const nextBoundIds = canvasState.boundsItems
    .filter((bound) => isNodeStrictlyInsideBound(targetNode, bound))
    .map((bound) => bound.id);

  const normalizedNext = normalizeBoundIds(nextBoundIds);
  const normalizedCurrent = normalizeBoundIds(targetNode.bound_ids);
  if (
    normalizedNext.length === normalizedCurrent.length &&
    normalizedNext.every((entry, index) => entry === normalizedCurrent[index])
  ) {
    return canvasState;
  }

  return {
    ...canvasState,
    nodes: canvasState.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            bound_ids: normalizedNext,
          }
        : node
    ),
  };
};

export const removeBoundFromMembership = (nodes, boundId) =>
  (Array.isArray(nodes) ? nodes : []).map((node) => ({
    ...node,
    bound_ids: normalizeBoundIds(node.bound_ids).filter((entry) => entry !== boundId),
  }));

export const extractBoundPayload = (targetBound, globalNodes, globalEdges) => {
  const nodes = Array.isArray(globalNodes) ? globalNodes : [];
  const edges = Array.isArray(globalEdges) ? globalEdges : [];
  const insideNodes = nodes.filter(
    (node) => Array.isArray(node?.bound_ids) && node.bound_ids.includes(targetBound)
  );
  const insideIds = new Set(insideNodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const stubByExternalNodeId = new Map();
  const scopedEdges = [];

  edges.forEach((edge) => {
    const sourceInside = insideIds.has(edge.source);
    const targetInside = insideIds.has(edge.target);
    if (!sourceInside && !targetInside) return;
    if (sourceInside && targetInside) {
      scopedEdges.push(edge);
      return;
    }

    const missingNodeId = sourceInside ? edge.target : edge.source;
    const originalNode = nodeById.get(missingNodeId);
    if (!originalNode) return;

    if (!stubByExternalNodeId.has(missingNodeId)) {
      stubByExternalNodeId.set(missingNodeId, {
        id: `stub-${originalNode.id}`,
        type: originalNode.type,
        metadata: originalNode.metadata,
        isExternalContext: true,
        original_id: originalNode.id,
      });
    }

    const stubNode = stubByExternalNodeId.get(missingNodeId);
    scopedEdges.push({
      ...edge,
      source: sourceInside ? edge.source : stubNode.id,
      target: targetInside ? edge.target : stubNode.id,
    });
  });

  return {
    nodes: [...insideNodes, ...Array.from(stubByExternalNodeId.values())],
    edges: scopedEdges,
  };
};

