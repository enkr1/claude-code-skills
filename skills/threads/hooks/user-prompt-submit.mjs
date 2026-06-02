#!/usr/bin/env node
// threads UserPromptSubmit hook: injects open-thread context every turn so Claude
// never forgets parked work. Plain stdout on exit 0 is added to context.
// BULLETPROOF: any error exits 0 with no output. It must never block a prompt
// (exit 2 would erase the user's message).

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { load } from '../src/io.mjs';
import { summarize } from '../src/render.mjs';

/** Read the hook's stdin JSON (Claude pipes {prompt, cwd, ...}); empty on TTY. */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 80); // fallback so we never hang
  });
}

try {
  let cwd = process.cwd();
  try {
    const input = JSON.parse(await readStdin());
    if (input && typeof input.cwd === 'string') cwd = input.cwd;
  } catch {
    // no stdin / not JSON: keep process.cwd()
  }

  const file = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
  const project = process.env.THREADS_PROJECT || basename(cwd);
  const tree = await load(file);

  const hasWork = Object.values(tree.nodes).some((n) => n.project === project && n.status !== 'done');
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
