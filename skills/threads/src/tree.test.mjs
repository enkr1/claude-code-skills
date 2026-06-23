import { describe, it, expect } from 'vitest';
import { capture, switchTo, backtrack, complete, snooze, compact } from './tree.mjs';

const emptyTree = () => ({ current: null, nodes: {} });
const NOW = 1_000_000;

describe('capture', () => {
  it('adds a node to an empty tree and makes it the current active task', () => {
    const tree = capture(emptyTree(), { name: 'fix auth', project: 'form-check', now: NOW });
    const ids = Object.keys(tree.nodes);
    expect(ids).toHaveLength(1);
    const node = tree.nodes[ids[0]];
    expect(node.name).toBe('fix auth');
    expect(node.project).toBe('form-check');
    expect(node.status).toBe('active');
    expect(node.parent).toBeNull();
    expect(tree.current).toBe(node.id);
  });

  it('stamps started and lastTouched from now', () => {
    const tree = capture(emptyTree(), { name: 'x', project: 'p', now: NOW });
    const node = Object.values(tree.nodes)[0];
    expect(node.started).toBe(NOW);
    expect(node.lastTouched).toBe(NOW);
  });

  it('files a capture made while busy as a child of the current task, pausing it', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    tree = capture(tree, { name: 'B', project: 'p', now: NOW });
    const b = tree.nodes[tree.current];
    expect(b.parent).toBe(aId);
    expect(tree.nodes[aId].status).toBe('paused');
  });
});

describe('switchTo', () => {
  it('activates the target and pauses the previous current', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    tree = capture(tree, { name: 'B', project: 'p', now: NOW });
    const bId = tree.current;
    tree = switchTo(tree, aId, NOW);
    expect(tree.current).toBe(aId);
    expect(tree.nodes[aId].status).toBe('active');
    expect(tree.nodes[bId].status).toBe('paused');
  });
});

describe('backtrack', () => {
  it('returns to the parent, pausing the current node', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    tree = capture(tree, { name: 'B', project: 'p', now: NOW });
    const bId = tree.current;
    tree = backtrack(tree, NOW);
    expect(tree.current).toBe(aId);
    expect(tree.nodes[aId].status).toBe('active');
    expect(tree.nodes[bId].status).toBe('paused');
  });

  it('clears current when backtracking from a root', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    tree = backtrack(tree, NOW);
    expect(tree.current).toBeNull();
  });
});

describe('complete', () => {
  it('marks the current node done and returns to its parent', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    tree = capture(tree, { name: 'B', project: 'p', now: NOW });
    const bId = tree.current;
    tree = complete(tree, NOW);
    expect(tree.nodes[bId].status).toBe('done');
    expect(tree.current).toBe(aId);
    expect(tree.nodes[aId].status).toBe('active');
  });

  it('shifts a done parent children up to the grandparent and drops the parent', () => {
    let tree = capture(emptyTree(), { name: 'G', project: 'p', now: NOW });
    const gId = tree.current;
    tree = capture(tree, { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    tree = capture(tree, { name: 'B', project: 'p', now: NOW });
    const bId = tree.current;
    tree = complete(tree, NOW, aId); // A has child B
    expect(tree.nodes[aId]).toBeUndefined(); // done parent dropped
    expect(tree.nodes[bId].parent).toBe(gId); // child shifted up to grandparent
    expect(tree.nodes[gId]).toBeDefined();
  });

  it('completing the current parent lands current on the grandparent', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    tree = capture(tree, { name: 'B', project: 'p', now: NOW });
    const bId = tree.current;
    tree = capture(tree, { name: 'C', project: 'p', now: NOW });
    const cId = tree.current;
    tree = switchTo(tree, bId, NOW); // current = B, which has child C
    tree = complete(tree, NOW); // complete current B
    expect(tree.nodes[bId]).toBeUndefined();
    expect(tree.nodes[cId].parent).toBe(aId);
    expect(tree.current).toBe(aId);
    expect(tree.nodes[aId].status).toBe('active');
  });
});

describe('compact', () => {
  it('drops done parents and promotes their children, keeping done leaves', () => {
    const nodes = {
      a: { id: 'a', name: 'A', parent: null, status: 'done' },
      b: { id: 'b', name: 'B', parent: 'a', status: 'active' },
      d: { id: 'd', name: 'D', parent: null, status: 'done' },
    };
    const tree = compact({ current: 'b', nodes });
    expect(tree.nodes.a).toBeUndefined(); // done parent dropped
    expect(tree.nodes.b.parent).toBeNull(); // child promoted to root
    expect(tree.nodes.d).toBeDefined(); // done leaf kept
    expect(tree.current).toBe('b');
  });

  it('promotes children up through a chain of done parents', () => {
    const nodes = {
      a: { id: 'a', name: 'A', parent: null, status: 'done' },
      b: { id: 'b', name: 'B', parent: 'a', status: 'done' },
      c: { id: 'c', name: 'C', parent: 'b', status: 'active' },
    };
    const tree = compact({ current: 'c', nodes });
    expect(tree.nodes.a).toBeUndefined();
    expect(tree.nodes.b).toBeUndefined();
    expect(tree.nodes.c.parent).toBeNull(); // promoted up through both
    expect(tree.current).toBe('c');
  });
});

describe('snooze', () => {
  it('marks a node snoozed with a wake time and drops it as current', () => {
    let tree = capture(emptyTree(), { name: 'A', project: 'p', now: NOW });
    const aId = tree.current;
    const wake = NOW + 24 * 60 * 60 * 1000;
    tree = snooze(tree, aId, wake, NOW);
    expect(tree.nodes[aId].status).toBe('snoozed');
    expect(tree.nodes[aId].snoozeUntil).toBe(wake);
    expect(tree.current).toBeNull();
  });
});
