import { describe, it, expect } from 'vitest';
import { view, merge } from './session.mjs';

const baseState = () => ({
  sessions: {
    s1: { current: 'a', project: 'p', lastActive: 1 },
    s2: { current: 'c', project: 'q', lastActive: 2 },
  },
  nodes: {
    a: { id: 'a', name: 'A', session: 's1', status: 'active' },
    b: { id: 'b', name: 'B', session: 's1', status: 'paused' },
    c: { id: 'c', name: 'C', session: 's2', status: 'active' },
  },
});

describe('view', () => {
  it('slices one session into a single-tree {current, nodes}', () => {
    const v = view(baseState(), 's1');
    expect(v.current).toBe('a');
    expect(Object.keys(v.nodes).sort()).toEqual(['a', 'b']);
    expect(v.nodes.c).toBeUndefined();
  });

  it('returns null current and no nodes for an unknown session', () => {
    const v = view(baseState(), 'nope');
    expect(v.current).toBeNull();
    expect(v.nodes).toEqual({});
  });
});

describe('merge', () => {
  it('writes a session subtree back, tagging nodes, leaving other sessions untouched', () => {
    const state = baseState();
    const tree = {
      current: 'a2',
      nodes: {
        a: { id: 'a', name: 'A', status: 'paused' },
        a2: { id: 'a2', name: 'A2', status: 'active' },
      },
    };
    const next = merge(state, 's1', tree, { project: 'p', now: 99 });

    expect(next.nodes.a.status).toBe('paused');
    expect(next.nodes.a2.session).toBe('s1');
    expect(next.sessions.s1.current).toBe('a2');
    expect(next.sessions.s1.lastActive).toBe(99);
    // other session fully intact
    expect(next.nodes.c).toEqual(state.nodes.c);
    expect(next.sessions.s2).toEqual(state.sessions.s2);
  });
});
