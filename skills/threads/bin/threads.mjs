#!/usr/bin/env node
// threads CLI: thin wiring over the tested pure ops + session router + io + render.
// Each chat (CLAUDE_CODE_SESSION_ID) is its own tree with its own current; all
// chats share one global file so you can zoom out with `all`.

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { load, save } from '../src/io.mjs';
import { capture, switchTo, backtrack, complete, snooze, compactNodes } from '../src/tree.mjs';
import { render, renderGlobal } from '../src/render.mjs';
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

const state = await load(FILE);
const v = view(state, session);
const WRITES = new Set(['capture', 'switch', 'bt', 'done', 'snooze']); // only these mutate + save
let nv = v;
let output = '';

switch (cmd) {
  case 'capture':
    nv = capture(v, { name: arg, project, now });
    break;
  case 'switch':
    nv = switchTo(v, resolveId(v, arg), now);
    break;
  case 'bt':
    nv = backtrack(v, now);
    break;
  case 'done':
    nv = complete(v, now, resolveId(v, arg));
    break;
  case 'snooze': {
    const tail = rest[rest.length - 1];
    const days = Number(tail) || 1;
    const query = Number(tail) ? rest.slice(0, -1).join(' ') : arg;
    nv = snooze(v, resolveId(v, query), now + days * 86_400_000, now);
    break;
  }
  case undefined: // bare `threads` defaults to this chat's tree
  case 'tree':
    output = render(v, { label: project, now });
    break;
  case 'all':
    output = renderGlobal(state, { now });
    break;
  case 'compact': {
    // Global sweep across every chat: drop done parents and shift their children
    // up to the grandparent (done leaves stay). Saves the whole state directly,
    // not session-scoped, so the merge layer is bypassed.
    const nodes = compactNodes(state.nodes);
    const sessions = { ...state.sessions };
    for (const sid of Object.keys(sessions)) {
      if (sessions[sid].current && !nodes[sessions[sid].current]) {
        sessions[sid] = { ...sessions[sid], current: null };
      }
    }
    const next = { ...state, nodes, sessions };
    await save(FILE, next);
    output = render(view(next, session), { label: project, now });
    break;
  }
  default:
    output = 'threads: capture <name> | switch <q> | bt | done [q] | snooze <q> [days] | compact | tree | all';
}

if (WRITES.has(cmd)) {
  const next = merge(state, session, nv, { project, now });
  await save(FILE, next);
  output = render(view(next, session), { label: project, now }); // show this chat's updated tree
}
if (output) console.log(output);
