#!/usr/bin/env node
// threads installer: wires the UserPromptSubmit hook into ~/.claude/settings.json.
// Needed because plugin-defined hooks cannot inject context yet (claude-code#12151).
// Safe by design: backs up settings.json, appends (never clobbers), idempotent,
// validates the result. Run with: node ~/.claude/skills/threads/install.mjs

import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const hookPath = join(here, 'hooks', 'user-prompt-submit.mjs');
const command = `${process.execPath} ${hookPath}`; // the node that ran this installer
const settingsPath = join(homedir(), '.claude', 'settings.json');

async function main() {
  let settings = {};
  let existed = false;
  try {
    settings = JSON.parse(await readFile(settingsPath, 'utf8'));
    existed = true;
  } catch {
    await mkdir(join(homedir(), '.claude'), { recursive: true });
  }
  if (existed) await copyFile(settingsPath, `${settingsPath}.threads-bak`);

  settings.hooks ??= {};
  settings.hooks.UserPromptSubmit ??= [];

  const already = settings.hooks.UserPromptSubmit.some((group) =>
    (group.hooks ?? []).some((h) => (h.command ?? '').includes('threads')),
  );
  if (already) {
    console.log('threads: hook already installed.');
    return;
  }

  settings.hooks.UserPromptSubmit.push({
    hooks: [{ type: 'command', command, timeout: 10, statusMessage: 'threads: recalling open threads...' }],
  });

  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  JSON.parse(await readFile(settingsPath, 'utf8')); // validate

  console.log('threads: hook installed into ~/.claude/settings.json');
  if (existed) console.log(`threads: backup at ${settingsPath}.threads-bak`);
  console.log('threads: restart Claude Code to activate.');
}

main().catch((err) => {
  console.error('threads: install failed:', err.message);
  process.exit(1);
});
