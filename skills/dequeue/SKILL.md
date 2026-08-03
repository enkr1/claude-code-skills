---
name: dequeue
description: Pop the top item off the handoff queue and resume that work. Use at the start of a fresh session to continue queued work, or when the user says "dequeue", "takeover", "接手", "pick up the queue", "what's queued", "continue where we left off", or "resume the handoff". Paired with the enqueue skill, which writes items into the queue.
argument-hint: "[slug] — blank pops the top item; 'list' just shows the queue"
---

# Dequeue

Pop the top handoff off the queue, resume the work, and ack (archive) the doc only when the work is actually done. Paired with `enqueue`, which writes the items.

**This is peek + ack, not naive pop.** The doc stays in the queue while you work. It moves to `done/` only when its Done-when condition is met, so a session that dies mid-task loses nothing: the item is still queued for the next session.

## The queue

`~/.claude/handoffs/` — the directory IS the queue. No index file.

- Pending item: `p<N>-<yyyymmddhhmm>-<slug>.md` at the top level.
- Order: one lexical sort. `p1` before `p2` before `p3`, then oldest timestamp first within a priority.
- `done/` = popped items. Never resume from there.

```bash
ls ~/.claude/handoffs/p*.md 2>/dev/null | sort
```

First line = top of queue. No matches = queue empty: say so and stop.

## Selecting

- **Bare invocation** → take the first line of the sorted listing. Announce the pick before starting: item name, priority, and how many remain behind it. The user can redirect before you sink work in.
- **With a slug argument** → fuzzy-match against pending filenames. Jumping the queue is allowed; silently skipping the top item is not — name what you skipped ("taking `auth-refactor`, skipping p1 `parser-timeout-fix` ahead of it").
- **"list" / "what's queued"** → show the sorted queue with one line each (priority, age, slug, the doc's Next action first line). No pop, no work.
- Ambiguous slug (2+ matches) → show the matches, ask.

## Resuming

Read the doc top to bottom, then follow its own contract:

1. **Run Preflight exactly as written.** Every check's mismatch consequence is in the doc; honour it. A failed check with a "stop and report" consequence means stop and report, not improvise.
2. **Start at Next action.** The doc was written so these two sections alone are enough to begin. Read State / Why / Dead ends before deviating from the plan, not before starting it.
3. **Respect Authority.** The doc says what you may fix alone versus what needs the user. Preflight surprises outside your authority go back to the user with the mismatch, not a workaround.
4. If reality diverges from State beyond what Preflight anticipated, treat the doc as stale intel, not instructions: report the divergence, propose the adjusted plan, get a nod before proceeding.

## The pop (ack)

When the doc's **Done when** condition is observably met, and only then:

```bash
mv ~/.claude/handoffs/p2-202608031845-parser-timeout-fix.md ~/.claude/handoffs/done/
```

Then report: what was completed, evidence for Done-when (which env verified), and the remaining queue. `rm` is never the pop — `done/` is the archive and the undo.

**One pop per invocation.** After acking, show what's next in the queue and stop. The user decides whether to `/dequeue` again; chaining items uninvited is scope grab.

## Ending unfinished

Session ending with Done-when not yet met → invoke `enqueue` to rewrite the doc in place: fresh State, fresh Next action, same filename (same queue position). The doc you inherited is now stale by exactly the work you did; leaving it unrewritten poisons the next dequeue.

Partially done is the likeliest state a successor inherits. Say plainly in State what you finished, what you touched but did not finish, and what you never reached.

## Edge cases

| Found | Do |
|---|---|
| Queue empty | Say so, stop. Nothing to invent. |
| Preflight shows work already done (someone finished it outside the queue) | Verify Done-when independently, then ack with a note that it was found complete. Do not redo it. |
| Doc without `p` prefix at top level | Legacy item: treat as p2. Rename it into format (`p2-<yyyymmddhhmm from its date>-<slug>.md`) so the sort stays honest. |
| Two docs about the same task | Read both, keep the newer as truth, move the older to `done/` with a note in the survivor. |
| Doc's Preflight references a repo/branch that no longer exists | Outside authority by definition. Report, ask, do not reconstruct. |
