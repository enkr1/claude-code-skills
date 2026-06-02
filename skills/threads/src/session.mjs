// threads session router: slice one chat's tree out of the multi-session state
// and merge it back. This is what makes each chat its own thread with its own
// current pointer, while nodes live in one shared file.

/**
 * Slice one chat's tree out of the multi-session state.
 * @param {{sessions: Record<string, object>, nodes: Record<string, object>}} state
 * @param {string} sid session id
 * @returns {{current: string|null, nodes: Record<string, object>}} single-session tree
 */
export function view(state, sid) {
  const nodes = {};
  for (const [id, n] of Object.entries(state.nodes)) {
    if (n.session === sid) nodes[id] = n;
  }
  return { current: state.sessions[sid]?.current ?? null, nodes };
}

/**
 * Merge a session's edited subtree back into the full state. This session's
 * nodes are replaced (and re-tagged); every other session is left untouched.
 * @param {object} state full state
 * @param {string} sid session id
 * @param {{current: string|null, nodes: Record<string, object>}} tree edited subtree
 * @param {{project: string, now: number}} opts
 * @returns {object} new full state
 */
export function merge(state, sid, tree, { project, now }) {
  const nodes = {};
  for (const [id, n] of Object.entries(state.nodes)) {
    if (n.session !== sid) nodes[id] = n; // keep other chats' nodes
  }
  for (const [id, n] of Object.entries(tree.nodes)) {
    nodes[id] = { ...n, session: sid };
  }
  return {
    ...state,
    nodes,
    sessions: { ...state.sessions, [sid]: { current: tree.current, project, lastActive: now } },
  };
}
