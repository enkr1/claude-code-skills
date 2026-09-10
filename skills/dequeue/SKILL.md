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

- Pending item: `p<N>-<yyyymmddhhmm>-<slug>.md` at the top level, priority `p0` (drop-everything) through `p3` (backlog).
- Order: one lexical sort. Lower p first, then oldest timestamp first within a priority.
- `done/` = popped items. Never resume from there.

```bash
ls ~/.claude/handoffs/p*.md 2>/dev/null | sort
```

First line = top of queue. No matches = queue empty: say so and stop.

### Reconcile before you list

Work finishes outside `dequeue` and nothing acks the doc when it does, so settle judgement-free Done-whens first: a sha, `buildId` or deployed version is one `git merge-base --is-ancestor` away. Ack those, list the rest.

**Never extend this to prose Done-whens.** "Paints from disk with the network throttled" needs running; inferring it from a merge commit closes work never done. 2026-09-10: three settled this way, a fourth looked identical in git log and was half shipped.

## Selecting

- **Bare invocation** → take the first line of the sorted listing. Announce the pick before starting: item name, priority, and how many remain behind it. The user can redirect before you sink work in.
- **With a slug argument** → go straight to that one doc. Do NOT list the queue first; resolve and read in a single call:

```bash
ls ~/.claude/handoffs/*<slug>*.md
```

  One match → read it and start. Zero matches → only then fall back to the full listing. Jumping the queue is allowed and needs no ceremony; report what you skipped at the END, from the closing listing you already owe the user, not by listing up front.
- **"list" / "what's queued"** → show the sorted queue with one line each (priority, age, slug, the doc's Next action first line). No pop, no work.
- Ambiguous slug (2+ matches) → show the matches, ask.

## Resuming

Read the doc top to bottom, then follow its own contract:

1. **Run Preflight exactly as written.** Every check's mismatch consequence is in the doc; honour it. A failed check with a "stop and report" consequence means stop and report, not improvise.
2. **Read Decisions, then start at Next action.** A decision recorded there can have superseded a gate the rest of the doc still assumes, so it is the one section worth reading before you begin. State / Why / Dead ends can wait until you deviate from the plan.
3. **Respect Authority.** The doc says what you may fix alone versus what needs the user. Preflight surprises outside your authority go back to the user with the mismatch, not a workaround.
4. If reality diverges from State beyond what Preflight anticipated, treat the doc as stale intel, not instructions: report the divergence, propose the adjusted plan, get a nod before proceeding.

**The doc you just popped stays live for the rest of the session.** From the moment you resume, every fact you verify, decision the user makes, or approach you rule out goes straight back into it as you go:

```bash
~/.claude/scripts/hd.sh <slug> state 'rung now returns lastActive, verified against the detail payload'
```

This is the write-through half of `enqueue`. It is what makes ending the session cheap, because there is nothing left to reconstruct.

## The pop (ack)

When the doc's **Done when** condition is observably met, and only then:

```bash
mv ~/.claude/handoffs/p2-202608031845-parser-timeout-fix.md ~/.claude/handoffs/done/
```

Then report: what was completed, evidence for Done-when (which env verified), and the remaining queue. `rm` is never the pop — `done/` is the archive and the undo.

**One pop per invocation.** After acking, show what's next in the queue and stop. The user decides whether to `/dequeue` again; chaining items uninvited is scope grab.

## Ending unfinished

Session ending with Done-when not yet met → run `enqueue`'s CLOSE step, same filename so the queue position holds.

If you appended as you worked, CLOSE is small: rewrite **Next action** only, re-run Preflight, hand over. Everything else is already current. If you did not append, you are now paying the full rebuild at the worst context price of the session, which is the cost the write-through design exists to avoid. Do not repeat it next time.

Partially done is the likeliest state a successor inherits. Say plainly in State what you finished, what you touched but did not finish, and what you never reached.

## Edge cases

| Found | Do |
|---|---|
| Queue empty | Say so, stop. Nothing to invent. |
| Doc's remaining work is owner-QA only (his device, his account, his eyes) | Pop it now, no verification owed (owner, 2026-09-02). Report the check recipe in one line; he files a new item if it breaks. |
| Preflight shows work already done (someone finished it outside the queue) | Verify Done-when independently, then ack with a note that it was found complete. Do not redo it. |
| Doc without `p` prefix at top level | Legacy item: treat as p2. Rename it into format (`p2-<yyyymmddhhmm from its date>-<slug>.md`) so the sort stays honest. |
| Two docs about the same task | Read both, keep the newer as truth, move the older to `done/` with a note in the survivor. |
| Doc's Preflight references a repo/branch that no longer exists | Outside authority by definition. Report, ask, do not reconstruct. |
