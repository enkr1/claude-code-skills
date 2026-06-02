#!/usr/bin/env node
// threads statusline: prints a one-line "where am i" for the Claude Code status bar.
// Reads the global tree; scopes to the current project. Never throws (status bar must not break).

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { load } from '../src/io.mjs';

try {
  const file = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
  const project = process.env.THREADS_PROJECT || basename(process.cwd());
  const tree = await load(file);

  const open = Object.values(tree.nodes).filter(
    (n) => n.project === project && (n.status === 'active' || n.status === 'paused' || n.status === 'blocked'),
  );
  if (open.length === 0) {
    console.log('threads: idle');
  } else {
    const cur = tree.current && tree.nodes[tree.current] ? tree.nodes[tree.current].name : 'idle';
    const next = open.filter((n) => n.id !== tree.current).slice(0, 2).map((n) => n.name);
    console.log(`▸ ${cur}${next.length ? ` · next: ${next.join(', ')}` : ''} · ${open.length} open`);
  }
} catch {
  // status bar must never break the session
  console.log('');
}
