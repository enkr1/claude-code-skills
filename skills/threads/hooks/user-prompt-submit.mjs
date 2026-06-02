#!/usr/bin/env node
// threads UserPromptSubmit hook: injects open-thread context every turn so Claude
// never forgets parked work. Plain stdout on exit 0 is added to context.
// BULLETPROOF: any error exits 0 with no output. It must never block a prompt
// (exit 2 would erase the user's message).

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { load } from '../src/io.mjs';
import { summarize } from '../src/render.mjs';

try {
  const file = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
  const project = process.env.THREADS_PROJECT || basename(process.cwd());
  const tree = await load(file);

  const hasWork = Object.values(tree.nodes).some(
    (n) => n.project === project && n.status !== 'done',
  );
  if (hasWork) {
    process.stdout.write(
      `${summarize(tree, { project })}\n` +
        '(threads: if this message starts, switches, branches, or finishes work, update it via the threads skill.)\n',
    );
  }
} catch {
  // never block a prompt
}
process.exit(0);
