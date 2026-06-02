import { describe, it, expect } from 'vitest';
import { capture } from './tree.mjs';

const emptyTree = () => ({ current: null, nodes: {} });

describe('capture', () => {
  it('adds a node to an empty tree and makes it the current active task', () => {
    const tree = capture(emptyTree(), { name: 'fix auth', project: 'form-check' });

    const ids = Object.keys(tree.nodes);
    expect(ids).toHaveLength(1);

    const node = tree.nodes[ids[0]];
    expect(node.name).toBe('fix auth');
    expect(node.project).toBe('form-check');
    expect(node.status).toBe('active');
    expect(node.parent).toBeNull();
    expect(tree.current).toBe(node.id);
  });
});
