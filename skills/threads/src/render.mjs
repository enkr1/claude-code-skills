// threads view layer: render tree state into the style-A ASCII tree.

const GLYPHS = { active: '●', paused: '○', done: '✓', blocked: '✕', snoozed: '◦' };

/**
 * Map a node status to its style-A glyph. Unknown statuses fall back to a dot.
 * @param {string} status
 * @returns {string} single-width glyph
 */
export function statusGlyph(status) {
  return GLYPHS[status] ?? '·';
}

/**
 * Human duration: "18m" under an hour, "2h 30m" at or over an hour.
 * @param {number} ms elapsed milliseconds
 * @returns {string}
 */
export function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

const WIDTH = 60;

/** Lay `right` flush against the right edge at column WIDTH, after `left`. */
function padBetween(left, right) {
  if (!right) return left;
  const gap = Math.max(1, WIDTH - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

/**
 * Render the threads tree in style A: hairline header with counts, an
 * emoji-free glyph tree (current node pointed at with ▸), right-aligned
 * durations, and a reassurance footer. Pure: pass `now` for the clock.
 *
 * @param {{current: string|null, nodes: Record<string, object>}} tree
 * @param {{project: string, now: number}} opts
 * @returns {string} multi-line render
 */
export function render(tree, { project, now }) {
  const nodes = Object.values(tree.nodes).filter((n) => n.project === project);
  const ids = new Set(nodes.map((n) => n.id));
  const isRoot = (n) => n.parent === null || !ids.has(n.parent);
  const childrenOf = (id) => nodes.filter((n) => n.parent === id);

  const open = nodes.filter((n) => n.status === 'active' || n.status === 'paused' || n.status === 'blocked').length;
  const parked = nodes.filter((n) => n.status === 'snoozed').length;

  const rule = '  ' + '─'.repeat(WIDTH - 2);
  const lines = [
    padBetween(`  threads · ${project}`, `${open} open · ${parked} parked`),
    rule,
  ];

  const durationFor = (n) =>
    n.status === 'snoozed' ? 'parked' : n.status === 'done' ? '' : formatDuration(now - n.started);

  const walk = (node, depth, isLast) => {
    const pointer = tree.current === node.id ? '▸ ' : '  ';
    const connector = depth > 0 ? (isLast ? '└─ ' : '├─ ') : '';
    const indent = '  '.repeat(Math.max(0, depth - 1));
    const left = `  ${pointer}${indent}${connector}${statusGlyph(node.status)} ${node.name}`;
    lines.push(padBetween(left, durationFor(node)));
    const kids = childrenOf(node.id);
    kids.forEach((k, i) => walk(k, depth + 1, i === kids.length - 1));
  };
  nodes.filter(isRoot).forEach((r) => walk(r, 0, true));

  lines.push(rule, '  nothing dropped');
  return lines.join('\n');
}
