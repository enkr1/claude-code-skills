// threads persistence: atomic read/write of the multi-session state, with backup.
//
// State shape:
//   { sessions: { [sessionId]: { current, project, lastActive } },
//     nodes:    { [nodeId]:    { id, name, session, project, parent, status, ... } } }

import { readFile, writeFile, rename } from 'node:fs/promises';

export const emptyState = () => ({ sessions: {}, nodes: {} });

/** Bring any parsed blob to the current shape (migrates the legacy single-tree file). */
function migrate(obj) {
  if (obj && typeof obj === 'object' && obj.sessions) return obj;
  if (obj && typeof obj === 'object' && obj.nodes) {
    const nodes = {};
    for (const [id, n] of Object.entries(obj.nodes)) nodes[id] = { ...n, session: 'legacy' };
    return { sessions: { legacy: { current: obj.current ?? null, project: 'legacy', lastActive: 0 } }, nodes };
  }
  return emptyState();
}

/**
 * Load state from disk. Missing file -> empty state. Corrupt JSON -> try .bak,
 * then empty. Legacy {current, nodes} files are migrated. Never throws.
 * @param {string} path
 * @returns {Promise<{sessions: Record<string, object>, nodes: Record<string, object>}>}
 */
export async function load(path) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return emptyState();
  }
  try {
    return migrate(JSON.parse(raw));
  } catch {
    try {
      return migrate(JSON.parse(await readFile(`${path}.bak`, 'utf8')));
    } catch {
      return emptyState();
    }
  }
}

/**
 * Persist state atomically: back up current, write a temp file, rename over the
 * target so a crash mid-write can never corrupt state.
 * @param {string} path
 * @param {object} state
 * @returns {Promise<void>}
 */
export async function save(path, state) {
  try {
    const current = await readFile(path, 'utf8');
    await writeFile(`${path}.bak`, current);
  } catch {
    // no existing file to back up
  }
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`);
  await rename(tmp, path);
}
