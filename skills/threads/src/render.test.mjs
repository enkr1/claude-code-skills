import { describe, it, expect } from 'vitest';
import { statusGlyph, formatDuration, render, summarize, renderGlobal } from './render.mjs';

describe('statusGlyph', () => {
  it('maps each status to its style-A glyph', () => {
    expect(statusGlyph('active')).toBe('●');
    expect(statusGlyph('paused')).toBe('○');
    expect(statusGlyph('done')).toBe('✓');
    expect(statusGlyph('blocked')).toBe('✕');
    expect(statusGlyph('snoozed')).toBe('◦');
  });
});

describe('formatDuration', () => {
  it('shows minutes under an hour', () => {
    expect(formatDuration(18 * 60_000)).toBe('18m');
  });
  it('shows hours and minutes at or over an hour', () => {
    expect(formatDuration(150 * 60_000)).toBe('2h 30m');
  });
});

describe('render', () => {
  const min = 60_000;
  const now = 100 * 24 * 60 * min; // fixed clock for deterministic durations
  const tree = {
    current: 'a',
    nodes: {
      a: { id: 'a', name: 'build threads skill', project: 'form-check', parent: null, status: 'active', started: now - 18 * min },
      b: { id: 'b', name: 'spec', project: 'form-check', parent: 'a', status: 'done', started: now - 18 * min },
      c: { id: 'c', name: 'core ops', project: 'form-check', parent: 'a', status: 'active', started: now - 5 * min },
      d: { id: 'd', name: 'render', project: 'form-check', parent: 'a', status: 'paused', started: now - 1 * min },
      m: { id: 'm', name: 'migrate 28 skills', project: 'form-check', parent: null, status: 'snoozed', started: now - 2 * 24 * 60 * min },
    },
  };
  const out = () => render(tree, { label: 'form-check', now });

  it('renders a header with project and open/parked counts', () => {
    const header = out().split('\n')[0];
    expect(header).toContain('threads · form-check');
    expect(header).toContain('3 open · 1 parked');
  });

  it('marks the current node with a pointer and its status glyph', () => {
    expect(out()).toContain('▸ ● build threads skill');
  });

  it('draws children with connectors and status glyphs', () => {
    expect(out()).toContain('├─ ✓ spec');
    expect(out()).toContain('└─ ○ render');
  });

  it('shows snoozed work as parked, not a duration', () => {
    const line = out().split('\n').find((l) => l.includes('migrate 28 skills'));
    expect(line).toContain('◦ migrate 28 skills');
    expect(line).toContain('parked');
  });

  it('ends with the reassurance footer', () => {
    expect(out().trimEnd().endsWith('nothing dropped')).toBe(true);
  });
});

describe('summarize', () => {
  const min = 60_000;
  const now = 100 * 24 * 60 * min;
  const tree = {
    current: 'a',
    nodes: {
      a: { id: 'a', name: 'build threads skill', project: 'form-check', parent: null, status: 'active', lastTouched: now - 18 * min },
      b: { id: 'b', name: 'spec', project: 'form-check', parent: 'a', status: 'done', lastTouched: now },
      c: { id: 'c', name: 'core ops', project: 'form-check', parent: 'a', status: 'active', lastTouched: now - 5 * min },
      d: { id: 'd', name: 'render', project: 'form-check', parent: 'a', status: 'paused', lastTouched: now - 1 * min },
      m: { id: 'm', name: 'migrate', project: 'form-check', parent: null, status: 'snoozed', lastTouched: now },
    },
  };

  it('names the current task and counts open vs parked', () => {
    const s = summarize(tree, { label: 'form-check' });
    expect(s).toContain('form-check');
    expect(s).toContain('build threads skill');
    expect(s).toContain('3 open');
    expect(s).toContain('1 parked');
  });

  it('omits done and snoozed nodes from the open list', () => {
    const s = summarize(tree, { label: 'form-check' });
    expect(s).not.toContain('spec');
    expect(s).not.toContain('migrate');
  });
});

describe('renderGlobal', () => {
  const now = 1000;
  const state = {
    sessions: {
      s1: { current: 'a', project: 'form-check', lastActive: 2 },
      s2: { current: 'c', project: 'bakery', lastActive: 1 },
    },
    nodes: {
      a: { id: 'a', name: 'fix auth', session: 's1', parent: null, status: 'active', started: now },
      b: { id: 'b', name: 'old done thing', session: 's1', parent: null, status: 'done', started: now },
      c: { id: 'c', name: 'menu page', session: 's2', parent: null, status: 'active', started: now },
    },
  };

  it('shows every chat that has open work, with project labels and a global header', () => {
    const out = renderGlobal(state, { now });
    expect(out).toContain('global');
    expect(out).toContain('fix auth');
    expect(out).toContain('menu page');
    expect(out).toContain('form-check');
    expect(out).toContain('bakery');
  });
});

describe('render (nested + current child)', () => {
  const now = 1000;
  // a -> (b -> c), a -> d(current). b is not a's last child, so b's branch must continue with │.
  const tree = {
    current: 'd',
    nodes: {
      a: { id: 'a', name: 'build', project: 'p', parent: null, status: 'paused', started: now },
      b: { id: 'b', name: 'core ops', project: 'p', parent: 'a', status: 'paused', started: now },
      c: { id: 'c', name: 'render', project: 'p', parent: 'b', status: 'done', started: now },
      d: { id: 'd', name: 'write SKILL.md', project: 'p', parent: 'a', status: 'active', started: now },
    },
  };
  const out = () => render(tree, { label: 'p', now });

  it('draws a vertical connector for a continuing branch', () => {
    expect(out()).toContain('│  └─ ✓ render');
  });

  it('marks a current child with a left-gutter pointer that does not collide with the connector', () => {
    expect(out()).toContain('▸ └─ ● write SKILL.md');
  });

  it('keeps non-current rows on a 2-space gutter', () => {
    expect(out()).toContain('  ├─ ○ core ops');
  });
});
