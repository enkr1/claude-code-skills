// threads core: pure tree operations (state in, new state out).
// File I/O and atomic writes live in a separate layer.

let seq = 0;
function newId(now) {
  seq += 1;
  return `task-${now.toString(36)}-${seq.toString(36)}`;
}

/** @returns {object} shallow-cloned node with patched fields */
function patch(node, fields) {
  return { ...node, ...fields };
}

/** Move `current` to a parent (or null), reactivating the parent if present. */
function returnToParent(nodes, node, now) {
  const parent = node.parent;
  if (parent && nodes[parent]) {
    nodes[parent] = patch(nodes[parent], { status: 'active', lastTouched: now });
    return parent;
  }
  return null;
}

/**
 * Capture a new task and make it current+active. A capture made while another
 * task is current becomes its child and pauses it, so a blurted idea is filed
 * under whatever you were doing.
 * @param {{current: string|null, nodes: Record<string, object>}} tree
 * @param {{name: string, project: string, now: number}} input
 * @returns {{current: string, nodes: Record<string, object>}}
 */
export function capture(tree, { name, project, now }) {
  const id = newId(now);
  const nodes = { ...tree.nodes };
  if (tree.current && nodes[tree.current]) {
    nodes[tree.current] = patch(nodes[tree.current], { status: 'paused' });
  }
  nodes[id] = { id, name, project, parent: tree.current, status: 'active', started: now, lastTouched: now };
  return { ...tree, current: id, nodes };
}

/**
 * Make an existing node current and active, pausing the node you were on.
 * Unknown ids are ignored (tree returned unchanged).
 * @param {object} tree
 * @param {string} id
 * @param {number} now
 * @returns {object} new tree
 */
export function switchTo(tree, id, now) {
  if (!tree.nodes[id]) return tree;
  const nodes = { ...tree.nodes };
  if (tree.current && nodes[tree.current]?.status === 'active') {
    nodes[tree.current] = patch(nodes[tree.current], { status: 'paused' });
  }
  nodes[id] = patch(nodes[id], { status: 'active', lastTouched: now });
  return { ...tree, current: id, nodes };
}

/**
 * Return to the current task's parent, pausing the current node. Does NOT
 * complete it (use complete for that). Clears current at a root.
 * @param {object} tree
 * @param {number} now
 * @returns {object} new tree
 */
export function backtrack(tree, now) {
  if (!tree.current || !tree.nodes[tree.current]) return tree;
  const nodes = { ...tree.nodes };
  const node = patch(nodes[tree.current], { status: 'paused', lastTouched: now });
  nodes[node.id] = node;
  return { ...tree, current: returnToParent(nodes, node, now), nodes };
}

/**
 * Mark a node done (defaults to current) and, if it was current, return to its
 * parent. Unknown ids are ignored.
 * @param {object} tree
 * @param {number} now
 * @param {string} [id] node to complete; defaults to current
 * @returns {object} new tree
 */
export function complete(tree, now, id = tree.current) {
  if (!id || !tree.nodes[id]) return tree;
  const nodes = { ...tree.nodes };
  const node = nodes[id];
  const kids = Object.values(nodes).filter((n) => n.parent === id);

  if (kids.length > 0) {
    // A finished PARENT leaves the tree and its children shift up to the
    // grandparent, so open work never stays stranded under a done branch.
    for (const kid of kids) nodes[kid.id] = patch(kid, { parent: node.parent });
    delete nodes[id];
    if (node.parent && nodes[node.parent]) {
      nodes[node.parent] = patch(nodes[node.parent], { status: 'active', lastTouched: now });
    }
    const current =
      id === tree.current ? (node.parent && nodes[node.parent] ? node.parent : null) : tree.current;
    return { ...tree, current, nodes };
  }

  // A finished LEAF stays as visible done history; current returns to its parent.
  nodes[id] = patch(node, { status: 'done', lastTouched: now });
  const current = id === tree.current ? returnToParent(nodes, nodes[id], now) : tree.current;
  return { ...tree, current, nodes };
}

/**
 * Pure node-map sweep: drop every DONE node that still has children, shifting
 * those children up to the done node's parent, repeated until none remain. Done
 * LEAVES are kept (visible history). Children of a node share its session, so
 * promotion stays in-chat and this is safe across the whole multi-chat map.
 * @param {Record<string, object>} input nodes map
 * @returns {Record<string, object>} new nodes map
 */
export function compactNodes(input) {
  const nodes = { ...input };
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of Object.values(nodes)) {
      if (node.status !== 'done') continue;
      const kids = Object.values(nodes).filter((n) => n.parent === node.id);
      if (kids.length === 0) continue;
      for (const kid of kids) nodes[kid.id] = patch(kid, { parent: node.parent });
      delete nodes[node.id];
      changed = true;
      break; // structure changed; restart the scan
    }
  }
  return nodes;
}

/**
 * Compact one chat's tree (see {@link compactNodes}); clears current only if it
 * somehow pointed at a removed node (it never should; current is never done).
 * @param {object} tree
 * @returns {object} new tree
 */
export function compact(tree) {
  const nodes = compactNodes(tree.nodes);
  const current = tree.current && !nodes[tree.current] ? null : tree.current;
  return { ...tree, current, nodes };
}

/**
 * Snooze a node until `until`, deferring it without losing it. If it was
 * current, return to its parent.
 * @param {object} tree
 * @param {string} id
 * @param {number} until wake timestamp
 * @param {number} now
 * @returns {object} new tree
 */
export function snooze(tree, id, until, now) {
  if (!tree.nodes[id]) return tree;
  const nodes = { ...tree.nodes };
  const node = patch(nodes[id], { status: 'snoozed', snoozeUntil: until, lastTouched: now });
  nodes[id] = node;
  const current = id === tree.current ? returnToParent(nodes, node, now) : tree.current;
  return { ...tree, current, nodes };
}
