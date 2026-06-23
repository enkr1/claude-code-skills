// threads view layer: render a chat's tree (style A, emoji-free glyphs) and the
// cross-chat global forest. Per-chat functions take a single-session subtree.

import { view } from './session.mjs';

const GLYPHS = { active: '●', paused: '○', done: '✓', blocked: '✕', snoozed: '◦' };

/** Map a node status to its style-A glyph. Unknown statuses fall back to a dot. */
export function statusGlyph(status) {
  return GLYPHS[status] ?? '·';
}

/** Human duration: "18m" under an hour, "2h 30m" at or over an hour. */
export function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

const WIDTH = 60;
const RULE = `  ${'─'.repeat(WIDTH - 2)}`;

/** Lay `right` flush against the right edge at column WIDTH, after `left`. */
function padBetween(left, right) {
  if (!right) return left;
  const gap = Math.max(1, WIDTH - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

function counts(tree) {
  const ns = Object.values(tree.nodes);
  return {
    open: ns.filter((n) => n.status === 'active' || n.status === 'paused' || n.status === 'blocked').length,
    parked: ns.filter((n) => n.status === 'snoozed').length,
  };
}

/**
 * Render just the node lines of a single-session tree (no header/footer):
 * branch prefixes with │ bars, a left-gutter ▸ for the current node, right-aligned
 * durations, snoozed -> "parked".
 * @returns {string[]} lines
 */
function renderBody(tree, now) {
  const nodes = Object.values(tree.nodes);
  const ids = new Set(nodes.map((n) => n.id));
  const isRoot = (n) => n.parent === null || !ids.has(n.parent);
  const childrenOf = (id) => nodes.filter((n) => n.parent === id);
  const durationFor = (n) =>
    n.status === 'snoozed' ? 'parked' : n.status === 'done' ? '' : formatDuration(now - n.started);

  const lines = [];
  const walk = (node, branchPrefix, isRootNode, isLast) => {
    const pointer = tree.current === node.id ? '▸ ' : '  ';
    const connector = isRootNode ? '' : isLast ? '└─ ' : '├─ ';
    const left = `${pointer}${branchPrefix}${connector}${statusGlyph(node.status)} ${node.name}`;
    lines.push(padBetween(left, durationFor(node)));
    const childPrefix = branchPrefix + (isRootNode ? '' : isLast ? '   ' : '│  ');
    const kids = childrenOf(node.id);
    kids.forEach((k, i) => walk(k, childPrefix, false, i === kids.length - 1));
  };
  const roots = nodes.filter(isRoot);
  roots.forEach((r, i) => walk(r, '', true, i === roots.length - 1));
  return lines;
}

/**
 * Render one chat's tree: hairline header with `label` and open/parked counts,
 * the glyph tree, a reassurance footer.
 * @param {{current: string|null, nodes: Record<string, object>}} tree single-session subtree
 * @param {{label: string, now: number}} opts
 * @returns {string}
 */
export function render(tree, { label, now }) {
  const { open, parked } = counts(tree);
  return [
    padBetween(`  threads · ${label}`, `${open} open · ${parked} parked`),
    RULE,
    ...renderBody(tree, now),
    RULE,
    '  nothing dropped',
  ].join('\n');
}

const OPEN_ORDER = { active: 0, blocked: 1, paused: 2 };
const isOpen = (n) => n.status in OPEN_ORDER;

/**
 * Compact one-glance state for the hook to inject: current task, top open work
 * (active > blocked > paused, then recency), and counts. Operates on one chat's
 * subtree; `label` is the project shown in the header.
 * @param {{current: string|null, nodes: Record<string, object>}} tree
 * @param {{label: string}} opts
 * @returns {string}
 */
export function summarize(tree, { label }) {
  const nodes = Object.values(tree.nodes);
  const open = nodes
    .filter(isOpen)
    .sort((a, b) => OPEN_ORDER[a.status] - OPEN_ORDER[b.status] || (b.lastTouched ?? 0) - (a.lastTouched ?? 0));
  const parked = nodes.filter((n) => n.status === 'snoozed').length;

  const current = tree.current && tree.nodes[tree.current] ? tree.nodes[tree.current].name : '(none)';
  const next = open.filter((n) => n.id !== tree.current).slice(0, 2).map((n) => n.name).join(', ');
  return `[threads·${label}] ▸ ${current}${next ? ` · next: ${next}` : ''} · ${open.length} open${parked ? ` · ${parked} parked` : ''}`;
}

/**
 * Render the cross-chat forest: every chat that still has open work, sorted by
 * project then recency, each as its own labelled tree under one global header.
 * @param {{sessions: Record<string, object>, nodes: Record<string, object>}} state
 * @param {{now: number}} opts
 * @returns {string}
 */
export function renderGlobal(state, { now }) {
  const sids = Object.keys(state.sessions).sort((a, b) => {
    const pa = state.sessions[a].project ?? '';
    const pb = state.sessions[b].project ?? '';
    if (pa !== pb) return pa < pb ? -1 : 1;
    return (state.sessions[b].lastActive ?? 0) - (state.sessions[a].lastActive ?? 0);
  });

  const blocks = [];
  let chats = 0;
  let totalOpen = 0;
  for (const sid of sids) {
    const sub = view(state, sid);
    const ns = Object.values(sub.nodes);
    if (!ns.some((n) => n.status !== 'done')) continue; // skip finished/empty chats
    chats += 1;
    totalOpen += counts(sub).open;
    const project = state.sessions[sid].project ?? 'global';
    const root = ns.find((n) => !n.parent || !sub.nodes[n.parent]);
    const chatName = (sub.current && sub.nodes[sub.current]?.name) || root?.name || 'chat';
    blocks.push(`  ◆ ${project} · ${chatName}`, ...renderBody(sub, now), '');
  }

  const header = padBetween('  threads · all', `${chats} chats · ${totalOpen} open`);
  if (chats === 0) return [header, RULE, '  (nothing open anywhere)'].join('\n');
  return [header, RULE, '', ...blocks, RULE, '  nothing dropped'].join('\n');
}

/** Ancestors of a node, root-first down to its parent (the node itself excluded). */
function ancestorsOf(nodes, node) {
  const chain = [];
  let pid = node.parent;
  while (pid && nodes[pid]) {
    chain.unshift(nodes[pid]);
    pid = nodes[pid].parent;
  }
  return chain;
}

/** Total descendants under a node (children + their children + ...). */
function descendantCount(nodes, id) {
  return Object.values(nodes)
    .filter((n) => n.parent === id)
    .reduce((sum, k) => sum + 1 + descendantCount(nodes, k.id), 0);
}

/** Breadcrumb names are orientation, not content: cap each so the line stays short. */
function crumb(name) {
  return name.length > 24 ? `${name.slice(0, 23)}…` : name;
}

/**
 * Focused "here" view: where you are plus one layer around it. A breadcrumb of
 * ancestors (capped), the current node, and its direct children, with deeper
 * subtrees folded to a "(+N deeper)" hint so the output stays bounded no matter
 * how deep the chat runs. The header still reports the chat's full open/parked
 * counts, so work parked elsewhere is never silently invisible. With no current,
 * lists the roots (the top layer).
 * @param {{current: string|null, nodes: Record<string, object>}} tree single-session subtree
 * @param {{label: string, now: number}} opts
 * @returns {string}
 */
export function renderHere(tree, { label, now }) {
  const nodes = tree.nodes;
  const { open, parked } = counts(tree);
  const head = padBetween(`  threads · ${label}`, `${open} open · ${parked} parked`);
  const dur = (n) => (n.status === 'snoozed' ? 'parked' : n.status === 'done' ? '' : formatDuration(now - n.started));
  const fold = (id) => {
    const d = descendantCount(nodes, id);
    return d ? `  (+${d} deeper)` : '';
  };
  const cur = tree.current && nodes[tree.current] ? nodes[tree.current] : null;
  const lines = [];

  if (!cur) {
    const roots = Object.values(nodes).filter((n) => !n.parent || !nodes[n.parent]);
    for (const r of roots) lines.push(padBetween(`  ${statusGlyph(r.status)} ${r.name}${fold(r.id)}`, dur(r)));
    if (lines.length === 0) lines.push('  (nowhere yet: capture or switch to a task)');
    return [head, RULE, ...lines, RULE, '  nothing dropped'].join('\n');
  }

  const anc = ancestorsOf(nodes, cur);
  if (anc.length) lines.push(`  … ${anc.map((a) => crumb(a.name)).join(' › ')}`);
  lines.push(padBetween(`▸ ${statusGlyph(cur.status)} ${cur.name}`, dur(cur)));
  const kids = Object.values(nodes).filter((n) => n.parent === cur.id);
  kids.forEach((k, i) => {
    const connector = i === kids.length - 1 ? '└─ ' : '├─ ';
    lines.push(padBetween(`     ${connector}${statusGlyph(k.status)} ${k.name}${fold(k.id)}`, dur(k)));
  });
  return [head, RULE, ...lines, RULE, '  nothing dropped'].join('\n');
}
