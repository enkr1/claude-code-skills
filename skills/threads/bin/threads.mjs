#!/usr/bin/env node
// threads CLI: thin wiring over the tested pure ops + session router + io + render.
// Each chat (CLAUDE_CODE_SESSION_ID) is its own tree with its own current; all
// chats share one global file so you can zoom out with `global`.

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { load, save } from '../src/io.mjs';
import { capture, switchTo, backtrack, complete, snooze } from '../src/tree.mjs';
import { render, summarize, renderGlobal } from '../src/render.mjs';
import { view, merge } from '../src/session.mjs';

const FILE = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
const session = process.env.THREADS_SESSION || process.env.CLAUDE_CODE_SESSION_ID || 'default';
const project = process.env.THREADS_PROJECT || basename(process.cwd());
const now = Date.now();

const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(' ');

/** Resolve a query to a node id within this chat: exact id, else newest name match. */
function resolveId(tree, query) {
  if (!query) return tree.current;
  if (tree.nodes[query]) return query;
  const q = query.toLowerCase();
  const hit = Object.values(tree.nodes)
    .filter((n) => n.name.toLowerCase().includes(q))
    .sort((a, b) => (b.lastTouched ?? 0) - (a.lastTouched ?? 0))[0];
  return hit?.id ?? null;
}

function statusline(tree) {
  const open = Object.values(tree.nodes).filter(
    (n) => n.status === 'active' || n.status === 'paused' || n.status === 'blocked',
  );
  if (open.length === 0) return 'threads: idle';
  const cur = tree.current && tree.nodes[tree.current] ? tree.nodes[tree.current].name : 'idle';
  const next = open.filter((n) => n.id !== tree.current).slice(0, 2).map((n) => n.name);
  return `▸ ${cur}${next.length ? ` · next: ${next.join(', ')}` : ''} · ${open.length} open`;
}

const state = await load(FILE);
const v = view(state, session);
const READ_ONLY = new Set(['tree', 'global', 'context', 'statusline', 'current', 'help', undefined]);
let nv = v;
let output = '';

switch (cmd) {
  case 'capture':
  case 'add':
    nv = capture(v, { name: arg, project, now });
    break;
  case 'switch':
    nv = switchTo(v, resolveId(v, arg), now);
    break;
  case 'bt':
  case 'backtrack':
    nv = backtrack(v, now);
    break;
  case 'done':
  case 'complete':
    nv = complete(v, now, resolveId(v, arg));
    break;
  case 'snooze': {
    const tail = rest[rest.length - 1];
    const days = Number(tail) || 1;
    const query = Number(tail) ? rest.slice(0, -1).join(' ') : arg;
    nv = snooze(v, resolveId(v, query), now + days * 86_400_000, now);
    break;
  }
  case 'tree':
    output = render(v, { label: project, now });
    break;
  case 'global':
    output = renderGlobal(state, { now });
    break;
  case 'context':
    output = summarize(v, { label: project });
    break;
  case 'statusline':
    output = statusline(v);
    break;
  case 'current':
    output = v.current && v.nodes[v.current] ? v.nodes[v.current].name : '(none)';
    break;
  default:
    output = 'threads: capture <name> | switch <q> | bt | done [q] | snooze <q> [days] | tree | global | context | statusline | current';
}

if (!READ_ONLY.has(cmd)) {
  const next = merge(state, session, nv, { project, now });
  await save(FILE, next);
  output = render(view(next, session), { label: project, now }); // show this chat's updated tree
}
if (output) console.log(output);
