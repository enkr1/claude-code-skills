#!/usr/bin/env node
// threads statusline: one-line "where am i" for THIS chat. Reads the global file,
// scopes to the current chat (CLAUDE_CODE_SESSION_ID). Never throws.

import { homedir } from 'node:os';
import { join } from 'node:path';
import { load } from '../src/io.mjs';
import { view } from '../src/session.mjs';

try {
  const file = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
  const session = process.env.THREADS_SESSION || process.env.CLAUDE_CODE_SESSION_ID || 'default';
  const tree = view(await load(file), session);

  const open = Object.values(tree.nodes).filter(
    (n) => n.status === 'active' || n.status === 'paused' || n.status === 'blocked',
  );
  if (open.length === 0) {
    console.log('threads: idle');
  } else {
    const cur = tree.current && tree.nodes[tree.current] ? tree.nodes[tree.current].name : 'idle';
    const next = open.filter((n) => n.id !== tree.current).slice(0, 2).map((n) => n.name);
    console.log(`▸ ${cur}${next.length ? ` · next: ${next.join(', ')}` : ''} · ${open.length} open`);
  }
} catch {
  console.log('');
}
