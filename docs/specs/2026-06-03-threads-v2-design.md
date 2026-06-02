# threads v2 (design thinking)

Date: 2026-06-03
Status: thinking, not scheduled. v1 shipped and in 磨合 (real-use shakedown). Build when pain is real, not before.

## Where v1 stands

v1 ships: per-chat branching tree, every-turn reinjection hook, statusline, global forest view, atomic persistence, 31 tests. Installed and live. One day of real use surfaced the gaps below; this doc captures the thinking so it survives to a build session.

## The make-or-break: can you trust it?

The promise is "no dropped balls", but v1's correctness rests on two soft links:

1. **Capture is Claude-driven.** A task enters the tree only if Claude runs `capture`. Miss it and the ball drops silently, which is the exact failure the tool exists to prevent.
2. **Status is recorded, not verified.** The tree believes whatever command ran. Real use already produced a wrong status (`bt` revived a done node and it was relayed as truth until spot-checked).

A tracker you cannot trust is worse than none: it gives false confidence.

### Direction: derive state from the transcript, not from memory

The session transcript (`.jsonl`) is ground truth of what actually happened: files edited, commands run, commits, what the user asked. v2 should reconcile the tree against that instead of relying on Claude remembering to call `capture`.

- A Stop hook (or a `reconcile` command) parses recent transcript turns plus git state, then captures work that happened but was not filed, and corrects or flags statuses that drifted (commit pushed -> mark done; a "done" with no evidence -> flag).
- This is the same mechanism as the throwaway "tree of what I built this session" transcript parser from the session that birthed threads. That parser is the auto-capture engine.
- Honest limit: transcript -> tasks needs interpretation (what is a task vs a step). Fully silent auto-capture is hard. The realistic win is a safety net that catches misses and verifies done-ness, so the tree stops lying.

This is the one v2 bet worth committing to. Everything else is secondary.

## Premise to challenge during 磨合: tree vs flat list

The branching model is elegant, but it carries complexity (reparenting, bt-onto-done, nested rendering). The test during real use: is the parent/child provenance actually used, or is the real need just "what is open, what is next, do not forget"? If the latter, a flat prioritized per-chat list is simpler and removes a whole bug class. Decide from real use; do not assume the tree earns its keep. Native Claude Code Tasks already cover flat lists, so threads should keep the tree only if the provenance genuinely helps.

## Candidate features

### Proven friction (felt in real use, build-worthy)

- **`reconcile`** — cross-check statuses against git/reality, flag and fix drift. The trust feature above, in its smallest form.
- **`bt` skip done** — backtrack should move to the nearest open ancestor, not revive a finished parent.
- **`rename`** — there is no rename command today; names had to be hand-edited. Names must also stay short (they live in a one-line statusline).

### Speculative (interesting, do NOT build until pain is real)

- **`now`** — surface ONE next action, not a queue. Decision paralysis is the ADHD tax; "do this next" beats a list.
- **Cross-chat continuity** — per-chat isolation strands a thread when you open a new chat. A way to pin a thread to the project so any chat sees it, or pull a thread from another chat.
- **Real priority** — today "next" is recency-ordered. Deadlines, blocking (`blockedBy` exists but is unused), or pinning would make the queue genuinely prioritized. This is the "smart triage" from the original brief, deferred.
- **Node types** — task vs note vs phase. v1 mixes deliverables with phase-markers ("磨合"), which confused rendering. Types could filter, but may be overkill.

### Robustness / distribution

- Unit-test the glue (CLI dispatch, session-env resolution, global render). The bt-revive bug slipped because ops/render tests did not cover bt-onto-done.
- Handle the `--resume` stale-replay of the `UserPromptSubmit` hook.
- Ship as a clean plugin once anthropics/claude-code#12151 (plugin hooks cannot inject) is fixed, and drop the manual installer step.
- `threads doctor` self-check (hook installed? node resolvable? settings valid?) for other installers.
- A demo GIF or asciinema in the README converts far better than text for a public repo.

## Discipline and sequencing

Build when pain is real. 磨合 will rank these. Likely order:

1. The proven friction (`reconcile`, `bt`-skip-done, `rename`) when next building.
2. The transcript-driven trust layer as the one big bet.
3. Speculative items only as real use promotes them.

## Open questions

- Tree or flat list (decided by 磨合)?
- How much auto-capture can transcript-parsing reliably do, versus how much stays Claude-driven and reconciled?
- Chat-scoped versus project-scoped threads, or both with pinning?
