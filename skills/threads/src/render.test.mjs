import { describe, it, expect } from 'vitest';
import { statusGlyph, formatDuration, render } from './render.mjs';

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
  const out = () => render(tree, { project: 'form-check', now });

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
