---
name: dequeue
description: Pop the top item off the handoff queue and resume that work. Use at the start of a fresh session to continue queued work, or when the user says "dequeue", "takeover", "接手", "pick up the queue", "what's queued", "continue where we left off", or "resume the handoff". Paired with the enqueue skill, which writes items into the queue.
argument-hint: "[slug]: blank pops the top item; 'list' just shows the queue"
---

# Dequeue

Pop the top handoff, resume the work, and ack (archive) the doc only when it is actually done. Paired with `enqueue`, which writes the items.

**A dequeue ends in a pop, and ONLY a session that verified 100% of the Done-when may pop.** Both halves bind. Verification is your job to go and do, so "I could not verify it" is doing less than the skill asks; but a Done-when 80% proven is not met, and popping claims it is. Under 100%, it stays queued.

**This is peek + ack, not naive pop.** The doc stays in the queue while you work and moves to `done/` only once Done-when is met, so a session that dies mid-task loses nothing.

**Context size never justifies refusing, narrowing or deferring what the user asked for.** It is a prompt to offer the close; their "do it" ends it.

## The queue

`~/.claude/handoffs/` is the queue, no index file. A pending item is `p<N>-<yyyymmddhhmm>-<slug>.md` at the top level, `p0` (drop-everything) through `p3` (backlog), sorted lexically: lower p first, oldest first within a priority. `done/` holds popped items and is never resumed from.

`ls ~/.claude/handoffs/p*.md 2>/dev/null | sort` prints it: first line is the top, no matches means empty, and empty means say so and stop.

### Before you list

**Reconcile.** Work finishes outside `dequeue` and nothing acks the doc, so settle judgement-free Done-whens first: a sha, `buildId` or deployed version is one `git merge-base --is-ancestor` away. Ack those, list the rest. **Never a prose Done-when**, which has to be run: inferring one from a merge commit closes work never done, and did on 2026-09-10.

**Triage.** Cap 20, no `p3`, enforced HERE and not at enqueue. Over either, clear the overflow oldest first before working the head: [references/triage.md](references/triage.md).

## Selecting

- **Bare invocation** → the first line of the sorted listing. Announce the pick first (item, priority, how many remain behind it) so the user can redirect before you sink work in.
- **With a slug** → straight to that one doc, no listing first: `ls ~/.claude/handoffs/*<slug>*.md`. Zero matches → then fall back to the full listing. Jumping the queue needs no ceremony; report what you skipped at the END, off the closing listing.
- **"list" / "what's queued"** → the sorted queue, one line each (priority, age, slug, the doc's Next action first line). No pop, no work.
- Ambiguous slug → show the matches, ask.
- **Name the doc's siblings at the pick.** Docs sharing a `**Source session:**` came out of one discussion, so listing them makes "all of them" one word from the user.

## Resuming

Read the doc top to bottom, then follow its own contract:

1. **Run Preflight exactly as written.** Every mismatch's consequence is in the doc; honour it. "Stop and report" means stop and report, not improvise.
2. **Follow any `docs/feature-<name>.md` pointer BEFORE Next action, reading its §0 ledger first.** The handoff holds session state; the feature doc holds the decisions and wins when they disagree. Its ledger says what is BUILT, UNBUILT, DROPPED or OPEN, and a struck decision names a premise the owner already killed.
3. **Read Decisions, then start at Next action.** A decision there can have superseded a gate the rest of the doc still assumes. State / Why / Dead ends can wait until you deviate from the plan.
4. **Respect Authority.** It says what you may fix alone versus what needs the user. Preflight surprises outside it go back with the mismatch, not a workaround.
5. Reality diverging from State beyond what Preflight anticipated makes the doc stale intel, not instructions: report the divergence, propose the adjusted plan, get a nod.

**Thin Decisions or Why means the discussion is still on disk**, so read it back off the doc's `**Source session:**` instead of guessing or re-asking the user:

```bash
jq -rn -f ~/.claude/skills/enqueue/asks.jq ~/.claude/projects/*/<source-session>.jsonl
```

**The doc stays live for the rest of the session, and so does the feature doc it points at.** Session state goes back into the handoff (`hd.sh <slug> state '<fact>'`); a DECISION goes into the feature doc in the same commit as the code it governs, never only into the handoff, which the task's end throws away. This is the write-through half of `enqueue`.

## The pop (ack)

When the doc's **Done when** condition is observably met, and only then:

```bash
~/.claude/scripts/hd.sh ack <slug>
```

**Every bullet under Open questions and Still open is disposed of first**, marked in place as `DONE`, `MOVED <slug | docs/feature-<name>.md | GT>` or `DROPPED <reason>`. `ack` refuses the move while one is unmarked and prints it, because an archived doc's open threads are dead threads.

**Verification is yours to OBTAIN, not to request.** Go get the proof: rebuild the harness, start the app, point the local build at real data. Proof is running it this session and reading the result; a commit subject that looks right, a merge or "probably shipped" is inference and never acks. Never ack around a gap: a partial proof is reported, not cashed. `rm` is never the pop, and `done/` is the undo.

Then report what was completed, the evidence for Done-when (which env), and the remaining queue.

**One pop per invocation.** After acking, show what's next in the queue and stop; chaining items uninvited is scope grab.

**Parking, and ending with the work unfinished**, are the exception and not the exit, and only after you have tried to obtain the proof yourself: [references/ending-unfinished.md](references/ending-unfinished.md).

## Edge cases

[references/edge-cases.md](references/edge-cases.md)
