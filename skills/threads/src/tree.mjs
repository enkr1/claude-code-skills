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
  const node = patch(nodes[id], { status: 'done', lastTouched: now });
  nodes[id] = node;
  const current = id === tree.current ? returnToParent(nodes, node, now) : tree.current;
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
