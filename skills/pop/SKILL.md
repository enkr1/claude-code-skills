---
name: pop
description: Pop the top item off the handoff queue and do it. Use at the start of a fresh session to continue queued work, or when the user says "pop", "dequeue", "deq", "takeover", "接手", "pick up the queue", "what's queued", "continue where we left off", or "resume the handoff". Paired with the enqueue skill, which writes items into the queue.
argument-hint: "[slug]: blank pops the top item; 'list' just shows the queue"
---

# Pop

Take the top handoff off the queue, do its work, ack it when the work lands.

**Pop means it leaves the queue now.** `hd.sh pop [slug]` moves the doc into `drafts/` at the pick, before you read a line of it, so no other session can take it and nothing has to earn its way out. Then DO its Next action. Why: under the old peek + ack, only a session that had verified 100% of the Done-when could pop, and on 2026-10-19 two sessions held shipped work for a phone check the owner never asked for ("so dumb").

**Landed is done.** Once the work is on origin, `hd.sh ack <slug>`. A check you could not run is one line in the report, never a reason to keep the doc and never a question to the user: no "say done", no "look at it on your phone", no "say deploy and I'll pop". Their look, their word and a promotion come after the ack, not before it.

**Context size never justifies refusing, narrowing or deferring what the user asked for.** It is a prompt to offer the close; their "do it" ends it.

## The queue

`~/.claude/handoffs/` is the queue, no index file. A pending item is `p<N>-<yyyymmddhhmm>-<slug>.md` at the top level, `p0` (drop-everything) through `p3` (backlog), sorted lexically: lower p first, oldest first within a priority. `drafts/` holds docs nobody asked to queue and docs a session popped; `done/` holds acked and expired ones and is never resumed from.

`~/.claude/scripts/hd.sh list` prints it: first line is the top, no output means empty, and empty means say so and stop.

**Before you pop**, reconcile (ack docs whose State names a pushed sha on origin) and triage (cap 20, no `p3`): [references/triage.md](references/triage.md).

## Selecting

- **Bare** → `hd.sh pop`: it takes the head. Announce it (item, priority, how many remain, siblings sharing its `**Source session:**`) so the user can redirect.
- **With a slug** → `hd.sh pop <slug>`; a doc already in `drafts/` prints its path, so resume it there. Report what you skipped at the END.
- **"list" / "what's queued"** → the sorted queue, one line each (priority, age, slug, the doc's Next action first line). No pop, no work.
- Ambiguous slug → show the matches, ask.

## Resuming

Read the doc top to bottom, then follow its own contract:

1. **Run Preflight exactly as written.** A check showing the work already landed means ack it now and say so.
2. **Follow any `docs/feature-<name>.md` pointer BEFORE Next action, reading its §0 ledger first.** The feature doc holds the decisions and wins when the two disagree.
3. **Read Decisions, then start at Next action.** A decision there can have superseded a gate the rest of the doc still assumes.
4. **Respect Authority.** It says what you may do alone; a promotion (`./deploy-web.sh`) stays the user's word and never holds the ack.
5. Reality diverging from State beyond what Preflight anticipated: report the divergence, propose the adjusted plan, get a nod.

**Thin Decisions or Why?** Read the discussion back off `**Source session:**`, never guess or re-ask: [references/edge-cases.md](references/edge-cases.md).

**The doc stays live while you work.** Session state goes back into it (`hd.sh <slug> state '<fact>'` finds it in `drafts/`); a DECISION goes into the feature doc in the same commit as the code it governs, never only into the handoff.

## Ack

When the work is on origin, or the user says it is done:

```bash
~/.claude/scripts/hd.sh ack <slug>
```

**Every bullet under Open questions and Still open is disposed of first**, marked in place as `DONE`, `MOVED <slug | docs/feature-<name>.md | GT>` or `DROPPED <reason>`; a question whose built default shipped is `DONE (default kept)`. With a `docs/feature-*.md` pointer, ack also needs a `**Sweep:**` line and refuses on any stale status line in docs/; its message says how to clear it.

Proof is the sha on origin, read this session (`git merge-base --is-ancestor`), plus the checks Done when names, run before the push. Unpushed work never acks. `rm` is never the ack, and `done/` is the undo.

Report what landed (sha, which env you checked), one line on anything you could not check, and the remaining queue.

**One pop per invocation.** After acking, show what's next in the queue and stop; chaining items uninvited is scope grab.

**Ending with the work not on origin yet:** [references/ending-unfinished.md](references/ending-unfinished.md).

## Edge cases

[references/edge-cases.md](references/edge-cases.md)
