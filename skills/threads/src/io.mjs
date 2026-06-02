// threads persistence: atomic read/write of the tree JSON, with a backup.

import { readFile, writeFile, rename } from 'node:fs/promises';

export const emptyTree = () => ({ current: null, nodes: {} });

/**
 * Load the tree from disk. Missing file -> empty tree. Corrupt JSON -> try the
 * .bak, then fall back to an empty tree (never throws, never loses you to a
 * parse error).
 * @param {string} path
 * @returns {Promise<{current: string|null, nodes: Record<string, object>}>}
 */
export async function load(path) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return emptyTree();
  }
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(await readFile(`${path}.bak`, 'utf8'));
    } catch {
      return emptyTree();
    }
  }
}

/**
 * Persist the tree atomically: back up the current file, write to a temp file,
 * then rename over the target so a crash mid-write can never corrupt the tree.
 * @param {string} path
 * @param {object} tree
 * @returns {Promise<void>}
 */
export async function save(path, tree) {
  try {
    const current = await readFile(path, 'utf8');
    await writeFile(`${path}.bak`, current);
  } catch {
    // no existing file to back up; fine on first save
  }
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(tree, null, 2)}\n`);
  await rename(tmp, path);
}
