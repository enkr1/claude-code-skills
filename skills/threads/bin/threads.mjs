#!/usr/bin/env node
// threads CLI: thin wiring over the tested pure ops + io + render.
// State lives in a single global file so task threads follow you across projects.

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { load, save } from '../src/io.mjs';
import { capture, switchTo, backtrack, complete, snooze } from '../src/tree.mjs';
import { render, summarize } from '../src/render.mjs';

const FILE = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
const project = process.env.THREADS_PROJECT || basename(process.cwd());
const now = Date.now();

const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(' ');

/** Resolve a user query to a node id: exact id, else newest open name match in this project. */
function resolveId(tree, query) {
  if (!query) return tree.current;
  if (tree.nodes[query]) return query;
  const q = query.toLowerCase();
  const hit = Object.values(tree.nodes)
    .filter((n) => n.project === project && n.name.toLowerCase().includes(q))
    .sort((a, b) => (b.lastTouched ?? 0) - (a.lastTouched ?? 0))[0];
  return hit?.id ?? null;
}

function statusline(tree) {
  const open = Object.values(tree.nodes).filter(
    (n) => n.project === project && (n.status === 'active' || n.status === 'paused' || n.status === 'blocked'),
  );
  const cur = tree.current && tree.nodes[tree.current] ? tree.nodes[tree.current].name : 'idle';
  const next = open.filter((n) => n.id !== tree.current).slice(0, 2).map((n) => n.name);
  return `▸ ${cur}${next.length ? ` · next: ${next.join(', ')}` : ''} · ${open.length} open`;
}

const tree = await load(FILE);
const READ_ONLY = new Set(['tree', 'context', 'statusline', 'current', 'help', undefined]);
let next = tree;
let output = '';

switch (cmd) {
  case 'capture':
  case 'add':
    next = capture(tree, { name: arg, project, now });
    break;
  case 'switch':
    next = switchTo(tree, resolveId(tree, arg), now);
    break;
  case 'bt':
  case 'backtrack':
    next = backtrack(tree, now);
    break;
  case 'done':
  case 'complete':
    next = complete(tree, now, resolveId(tree, arg));
    break;
  case 'snooze': {
    const tail = rest[rest.length - 1];
    const days = Number(tail) || 1;
    const query = Number(tail) ? rest.slice(0, -1).join(' ') : arg;
    next = snooze(tree, resolveId(tree, query), now + days * 86_400_000, now);
    break;
  }
  case 'tree':
    output = render(tree, { project, now });
    break;
  case 'context':
    output = summarize(tree, { project });
    break;
  case 'statusline':
    output = statusline(tree);
    break;
  case 'current':
    output = tree.current && tree.nodes[tree.current] ? tree.nodes[tree.current].name : '(none)';
    break;
  default:
    output = 'threads: capture <name> | switch <q> | bt | done [q] | snooze <q> [days] | tree | context | statusline | current';
}

if (!READ_ONLY.has(cmd)) {
  await save(FILE, next);
  output = render(next, { project, now }); // show the updated tree after a mutation
}
if (output) console.log(output);
