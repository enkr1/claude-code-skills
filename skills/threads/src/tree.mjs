// threads core: pure tree operations (state in, new state out).
// File I/O and atomic writes live in a separate layer.

let seq = 0;
function newId() {
  seq += 1;
  return `task-${Date.now().toString(36)}-${seq.toString(36)}`;
}

/**
 * Capture a new task into the tree and make it the current active node.
 * A capture made while another task is current becomes its child, so a
 * blurted-out idea is filed under whatever you were doing.
 *
 * @param {{current: string|null, nodes: Record<string, object>}} tree
 * @param {{name: string, project: string}} input
 * @returns {{current: string, nodes: Record<string, object>}} new tree
 */
export function capture(tree, input) {
  const id = newId();
  const node = {
    id,
    name: input.name,
    project: input.project,
    parent: tree.current,
    status: 'active',
  };
  return {
    ...tree,
    current: id,
    nodes: { ...tree.nodes, [id]: node },
  };
}
