---
name: enqueue
description: Queue unfinished work for a later session by writing a handoff doc into the priority queue. Use when work is unfinished and the session must end, before /clear on a live task, when context is nearly full, or when the user says "enqueue", "handoff", "写个交接", "pick this up later", or "I'll continue tomorrow". Paired with the dequeue skill, which pops and resumes queued items.
argument-hint: "What the next session picks up. Optionally p0-p3 priority."
---

# Enqueue

**A doc is opened when a thread is RAISED and appended to as the work happens, never reconstructed at the end.** A rebuild at close is a flush penalty paid at the session's most expensive point.

**The handoff carries what disk cannot.** Files, commits and plans survive on their own; the reasoning does not. What you verified, what you ruled out, why this approach beat the alternative: capture that, reference the rest.

**Context size never justifies refusing, narrowing or deferring what the user asked for.** It is information for them and a prompt to offer the close; their "do it" ends it.

## OPEN, one doc per thread

**A second topic raised mid-session gets its own doc at that moment**, about 150 tokens. Opened at close instead, each thread is reconstructed from working memory at the worst point of the session, and whichever ones miss a doc land in prose under Open questions, where the ack archives them alive.

**A decision, a design or a todo list goes into the repo's `docs/feature-<name>.md` FIRST; the handoff carries the pointer.**

```bash
mkdir -p ~/.claude/handoffs/done
cp ~/.claude/skills/enqueue/references/template.md \
   ~/.claude/handoffs/p2-$(date +%Y%m%d%H%M)-<slug>.md
```

`<slug>` is 2-4 kebab-case words naming the task, not the session. Fill in `**Source session:**` in the same pass: it is the only link back to the discussion, and it is what lets the successor recover an ask neither of you wrote down.

**Only open a doc for work you will resume within 72 hours.** Anything further out is a Google Task.

## APPEND, continuously

The moment a fact is verified, a decision is made, an approach is ruled out, or your own work makes an earlier line FALSE (append to that same section, leading with `SUPERSEDES`):

```bash
~/.claude/scripts/hd.sh <slug> state 'migration applied locally, NOT on staging, checked local dev only'
```

Sections: `decision` `state` `deadend` `question` `pointer` `why` `next` `preflight`. The script fails closed on an unknown or ambiguous slug, and never creates a doc.

**Append with the script, never with Edit**, which Reads the whole doc back first: ~150 tokens against 7,000.

`**Assumed:**` and `**Unverified:**` are load-bearing, and a label travels with its fact: hedged in State, it cannot appear flat elsewhere. The citation has to prove the claim, and `git log --oneline` cannot establish a line count.

## CLOSE, at end of session

The doc is already current, so closing is not a rebuild.

1. **Inventory the asks off the transcript, every close, no exceptions.** Recall is weakest exactly where the misses cluster, so read the messages back from disk and dispose of every ask out loud as `DONE`, `MOVED <slug>` or `DROPPED <reason>`. Recipe: [references/pitfalls.md](references/pitfalls.md).
2. **Rewrite Next action, its Done when and its Authority** with `hd.sh <slug> next --replace '<body>'`: the only section describing the future, so the only one that must be rewritten. A body carrying its own **Done when:** line rewrites the trailers too.
3. Run the **Preflight** block once and fix any check that no longer holds.
4. Read the doc as if you had no memory of the session, and fix what that read turns up before showing it. Finding a flaw and shipping it anyway is what this pass exists to prevent.

**Does every input Next action needs already exist?** Name the source of each number, field, endpoint and file it tells the successor to use. A step lifted from a mock is the usual failure: the mock had fake data, so the step reads as buildable while nothing in the app produces it. The other three questions, and the full checklist: [references/pitfalls.md](references/pitfalls.md).

**An open question with no default is a blocker; decide it at close.** Record the call and its reasoning, or put it in Authority with Next action's first line saying the work stops until the owner answers. Parked with neither, the successor stalls on a doc that looked complete.

**A handoff holds SESSION STATE, never a specification:** where you were standing, preflight, the branch, what is half-applied, the one next action. The test is whether the content survives the task finishing, so "the stamp already ran on prod" belongs here and "delivery starts a package, not payment" belongs in `docs/feature-<name>.md` with the handoff pointing at it. **Cap 8KB.**

Then hand over in one sentence plus the command, nothing else:

```
Enqueued: re-run the failing parser test against the new timeout branch (p2-202608031845-parser-timeout-fix.md, #2 of 3)

/dequeue parser-timeout-fix
```

**The slug is not optional, even at #1.** A bare `/dequeue` pops the queue head, so anywhere else it resumes a different task than the sentence just named.

No preamble, no summary, no pasted sections: the user sat through the session and the doc is one `cat` away.

## The queue

**The directory IS the priority queue**, no index file, nothing to desync, and minute-resolution timestamps make one lexical sort the whole queue.

- `p0` drop-everything, `p1` urgent, `p2` normal, `p3` backlog. Default `p2` silently unless the user hinted at urgency.
- **Re-opening an unfinished item keeps the original filename**, so a rewrite never resets its queue position.
- Popping is `dequeue` acking the doc into `done/`; enqueue never touches it.

Template: `references/template.md` · Pitfalls, the ask inventory, the full checklist: `references/pitfalls.md` · Why the relay is shaped this way: `~/.claude/docs/handoff-relay.md`
