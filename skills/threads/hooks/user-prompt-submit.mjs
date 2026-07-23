#!/usr/bin/env node
// threads UserPromptSubmit hook: injects THIS chat's open threads every turn so
// Claude never forgets parked work. Scoped to the chat via the stdin session_id.
// Plain stdout on exit 0 is added to context.
// BULLETPROOF: any error exits 0 with no output. Never blocks a prompt (exit 2
// would erase the user's message).

import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { load } from '../src/io.mjs';
import { view } from '../src/session.mjs';
import { summarize } from '../src/render.mjs';

/** Read the hook's stdin JSON (Claude pipes {prompt, cwd, session_id, ...}); empty on TTY. */
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
  let sid = process.env.CLAUDE_CODE_SESSION_ID || 'default';
  let cwd = process.cwd();
  try {
    const input = JSON.parse(await readStdin());
    if (input?.session_id) sid = input.session_id;
    if (typeof input?.cwd === 'string') cwd = input.cwd;
  } catch {
    // no/!json stdin: keep env + process.cwd()
  }

  const file = process.env.THREADS_FILE || join(homedir(), '.claude', 'threads.json');
  const project = process.env.THREADS_PROJECT || basename(cwd);
  const tree = view(await load(file), sid);

  const hasWork = Object.values(tree.nodes).some((n) => n.status !== 'done');
  if (hasWork) {
    const line = `${summarize(tree, { label: project })} · update threads if work changed`;

    // Emit only when the summary actually changed. An identical line is already
    // sitting in the transcript from an earlier turn, and every re-injection is
    // re-read (and re-billed) on every subsequent turn. Measured over ~5k
    // injections the text was overwhelmingly repeat sends of unchanged state.
    // PreCompact deletes the stamp so the first turn after a compaction
    // re-emits, since by then the earlier copy is gone from context.
    const stamp = join(homedir(), '.claude', '.threads-emitted', `${sid}`);
    let last = null;
    try {
      last = readFileSync(stamp, 'utf8');
    } catch {
      // no stamp yet: first turn of this session, fall through and emit
    }

    if (line !== last) {
      try {
        mkdirSync(join(homedir(), '.claude', '.threads-emitted'), { recursive: true });
        writeFileSync(stamp, line);
      } catch {
        // stamp is an optimisation, never a gate: emit even if it cannot persist
      }
      process.stdout.write(`${line}\n`);
    }
  }
} catch {
  // never block a prompt
}
process.exit(0);
