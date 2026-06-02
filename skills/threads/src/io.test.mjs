import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load, save, emptyState } from './io.mjs';

let dir;
let file;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'threads-'));
  file = join(dir, 'threads.json');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('load', () => {
  it('returns an empty state (sessions + nodes) when the file does not exist', async () => {
    expect(await load(file)).toEqual({ sessions: {}, nodes: {} });
  });

  it('round-trips a saved state', async () => {
    const state = {
      sessions: { s1: { current: 'a', project: 'demo', lastActive: 5 } },
      nodes: { a: { id: 'a', name: 'x', session: 's1', status: 'active' } },
    };
    await save(file, state);
    expect(await load(file)).toEqual(state);
  });

  it('falls back to empty state on corrupt json', async () => {
    await writeFile(file, '{ not json');
    expect(await load(file)).toEqual({ sessions: {}, nodes: {} });
  });

  it('migrates a legacy {current, nodes} file into a "legacy" session', async () => {
    await writeFile(file, JSON.stringify({ current: 'a', nodes: { a: { id: 'a', name: 'old' } } }));
    const state = await load(file);
    expect(state.sessions.legacy.current).toBe('a');
    expect(state.nodes.a.session).toBe('legacy');
    expect(state.nodes.a.name).toBe('old');
  });
});

describe('save', () => {
  it('leaves no .tmp file behind (atomic rename)', async () => {
    await save(file, emptyState());
    let tmpExists = true;
    try {
      await readFile(`${file}.tmp`);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('keeps a .bak of the previous contents', async () => {
    await save(file, { sessions: { a: { current: 'first' } }, nodes: {} });
    await save(file, { sessions: { a: { current: 'second' } }, nodes: {} });
    const bak = JSON.parse(await readFile(`${file}.bak`, 'utf8'));
    expect(bak.sessions.a.current).toBe('first');
  });
});
