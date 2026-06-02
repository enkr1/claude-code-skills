import { describe, it, expect } from 'vitest';
import { capture, switchTo, backtrack, complete, snooze } from './tree.mjs';

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
