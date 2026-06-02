import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load, save, emptyTree } from './io.mjs';

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
  it('returns an empty tree when the file does not exist', async () => {
    expect(await load(file)).toEqual({ current: null, nodes: {} });
  });

  it('round-trips a saved tree', async () => {
    const tree = { current: 'a', nodes: { a: { id: 'a', name: 'x', status: 'active' } } };
    await save(file, tree);
    expect(await load(file)).toEqual(tree);
  });

  it('falls back to an empty tree on corrupt json', async () => {
    await writeFile(file, '{ not json');
    expect(await load(file)).toEqual({ current: null, nodes: {} });
  });
});

describe('save', () => {
  it('leaves no .tmp file behind (atomic rename)', async () => {
    await save(file, emptyTree());
    let tmpExists = true;
    try {
      await readFile(`${file}.tmp`);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('keeps a .bak of the previous contents', async () => {
    await save(file, { current: 'first', nodes: {} });
    await save(file, { current: 'second', nodes: {} });
    const bak = JSON.parse(await readFile(`${file}.bak`, 'utf8'));
    expect(bak.current).toBe('first');
  });
});
