---
name: dequeue
description: Pop the top item off the handoff queue and resume that work. Use at the start of a fresh session to continue queued work, or when the user says "dequeue", "takeover", "接手", "pick up the queue", "what's queued", "continue where we left off", or "resume the handoff". Paired with the enqueue skill, which writes items into the queue.
argument-hint: "[slug] — blank pops the top item; 'list' just shows the queue"
---

# Dequeue

Pop the top handoff off the queue, resume the work, and ack (archive) the doc only when the work is actually done. Paired with `enqueue`, which writes the items.

**A dequeue ends in a pop, and ONLY a session that verified 100% of the Done-when may pop.** Both halves bind. Verification is your job to go and do, not to request, so "I could not verify it" is you doing less than the skill asks; but a Done-when 80% proven is not met, and popping is a claim that it is. Under 100%, it stays queued.

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

### Triage before you list

Cap 20, no `p3`, enforced HERE and not at enqueue. Over either, clear the overflow oldest first before working the head: [references/triage.md](references/triage.md).

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
2. **Follow any `docs/feature-<name>.md` pointer BEFORE Next action, and read its §0 ledger first.** A handoff holds session state; the feature doc holds the decisions and the vocabulary, and it is the SSOT when the two disagree. The ledger says what is BUILT, UNBUILT, DROPPED or OPEN, and a struck decision there names a premise already tried, so reading it is what stops you re-proposing something the owner killed last week.
3. **Read Decisions, then start at Next action.** A decision recorded there can have superseded a gate the rest of the doc still assumes, so it is the one section worth reading before you begin. State / Why / Dead ends can wait until you deviate from the plan.
4. **Respect Authority.** The doc says what you may fix alone versus what needs the user. Preflight surprises outside your authority go back to the user with the mismatch, not a workaround.
5. If reality diverges from State beyond what Preflight anticipated, treat the doc as stale intel, not instructions: report the divergence, propose the adjusted plan, get a nod before proceeding.

**The doc you just popped stays live for the rest of the session, and so does the feature doc it points at.** Session state goes back into the handoff; a DECISION the user makes goes into the feature doc in the same commit as the code it governs, never only into the handoff, which is thrown away when the task ends:

```bash
~/.claude/scripts/hd.sh <slug> state 'rung now returns lastActive, verified against the detail payload'
```

This is the write-through half of `enqueue`. It is what makes ending the session cheap, because there is nothing left to reconstruct.

## The pop (ack)

When the doc's **Done when** condition is observably met, and only then:

```bash
mv ~/.claude/handoffs/p2-202608031845-parser-timeout-fix.md ~/.claude/handoffs/done/
```

**Verification is yours to OBTAIN, not to request.** Go get the proof: rebuild the harness, start the app, seed the data, point the local build at real data. Proof is running it this session and reading the result; a commit subject that looks right, a merge or "probably shipped" is inference and never acks. Parking is RARE, because most of the time 100% is reachable, so "blocked" is a claim that needs testing like any other and "not enough context budget" is a trade you may make but must say out loud, never dress as impossible. Park only when the proof needs his credentials, his hardware or his authority and nothing else can establish the substance, leaving the remaining step named in one line. Never ack around a gap: a partial proof is reported, not cashed. Asked four times on 2026-09-13.

Then report: what was completed, evidence for Done-when (which env verified), and the remaining queue. `rm` is never the pop — `done/` is the archive and the undo.

**One pop per invocation.** After acking, show what's next in the queue and stop. The user decides whether to `/dequeue` again; chaining items uninvited is scope grab.

## Ending unfinished

The exception, not the exit, and only after you have tried to obtain the proof yourself: [references/ending-unfinished.md](references/ending-unfinished.md).

## Edge cases

[references/edge-cases.md](references/edge-cases.md)
