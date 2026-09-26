---
name: enqueue
description: Draft a handoff doc as work happens, and queue it for a later session only when the user asks. Use when work looks like it will outlive the session (draft it), before /clear on a live task, or when the user says "enqueue", "handoff", "写个交接", "pick this up later", or "I'll continue tomorrow" (queue it). Paired with the dequeue skill, which pops and resumes queued items.
argument-hint: "What the next session picks up. Optionally p0-p3 priority."
---

# Enqueue

**A doc is opened in `drafts/` when a thread is RAISED and appended to as the work happens, never reconstructed at the end.** A rebuild at close is a flush penalty paid at the session's most expensive point.

**Only the user puts work in the queue.** You draft, they ask, `hd.sh promote` records their words. An item queued on your own judgement is the one nobody dequeues.

**The handoff carries what disk cannot.** Files, commits and plans survive on their own; the reasoning does not. What you verified, what you ruled out, why this approach beat the alternative: capture that, reference the rest.

**Context size never justifies refusing, narrowing or deferring what the user asked for.** It is information for them and a prompt to offer the close; their "do it" ends it.

## OPEN, one doc per thread

**A second topic raised mid-session gets its own doc at that moment**, about 150 tokens. Opened at close instead, each thread is reconstructed from working memory at the worst point of the session, and whichever ones miss a doc land in prose under Open questions, where the ack archives them alive.

**A decision, a design or a todo list goes into the repo's `docs/feature-<name>.md` FIRST; the handoff carries the pointer.**

```bash
mkdir -p ~/.claude/handoffs/drafts
cp ~/.claude/skills/enqueue/references/template.md \
   ~/.claude/handoffs/drafts/p2-$(date +%Y%m%d%H%M)-<slug>.md
```

`<slug>` is 2-4 kebab-case words naming the task, not the session. Fill in `**Source session:**` in the same pass: it is the only link back to the discussion.

A draft idle for 72 hours expires into `done/` on its own. Work further out than that is a Google Task.

## QUEUE, only on the user's ask

```bash
~/.claude/scripts/hd.sh promote <slug> '<their words, verbatim>'
```

The only way in. It refuses unless those words appear in a message the user typed (or an AskUserQuestion answer), and refuses at the 20-item cap with the list for them to cut from. Offering is fine; promoting without their words is not. A doc copied straight into the queue is moved back to `drafts/` by the Stop hook, which says so.

## APPEND, continuously

The moment a fact is verified, a decision is made, an approach is ruled out, or your own work makes an earlier line FALSE (append to that same section, leading with `SUPERSEDES`):

```bash
~/.claude/scripts/hd.sh <slug> state 'migration applied locally, NOT on staging, checked local dev only'
```

Sections: `decision` `state` `deadend` `question` `pointer` `why` `next` `preflight`. The script fails closed on an unknown or ambiguous slug, and never creates a doc.

**Append with the script, never with Edit**: ~150 tokens against 7,000.

`**Assumed:**` and `**Unverified:**` are load-bearing, and a label travels with its fact: hedged in State, it cannot appear flat elsewhere. The citation has to prove the claim, and `git log --oneline` cannot establish a line count.

## CLOSE, at end of session

The doc is already current, so closing is not a rebuild.

1. **Inventory the asks off the transcript, every close, no exceptions.** Recall is weakest exactly where the misses cluster, so read the messages back from disk and dispose of every ask out loud as `DONE`, `MOVED <slug>` or `DROPPED <reason>`. Recipe: [references/pitfalls.md](references/pitfalls.md).
2. **Rewrite Next action, its Done when and its Authority** with `hd.sh <slug> next --replace '<body>'`: the only section describing the future, so the only one that must be rewritten. A body carrying its own **Done when:** line rewrites the trailers too.
3. Run the **Preflight** block once and fix any check that no longer holds.
4. Read the doc as if you had no memory of the session, and fix what that read turns up before showing it. Finding a flaw and shipping it anyway is what this pass exists to prevent. Checklist: [references/pitfalls.md](references/pitfalls.md).

**Done when met this session → `hd.sh ack <slug>` in that turn**, whoever opened the doc; no dequeue needed, and the user saying it is done is proof. When the user changes the scope, rewrite Done when in the same turn, since a stale one can never be met. **The user's own QA is never part of Done when**: shipped and verified by you is done, and they come back if it breaks, so no reminder either. Open-ended residue (accruing notes, a domain question) is `MOVED` to its home, never a reason to stay queued.

**A handoff holds SESSION STATE, never a specification. Cap 8KB.**

Not promoted: one line naming the draft and that it expires in 72 hours unless they say enqueue. Promoted: one sentence plus the command, nothing else:

```
Enqueued: re-run the failing parser test against the new timeout branch (p2-202608031845-parser-timeout-fix.md, #2 of 3)

/dequeue parser-timeout-fix
```

**The slug is not optional, even at #1.** A bare `/dequeue` pops the queue head, so anywhere else it resumes a different task than the sentence just named.

No preamble, no summary, no pasted sections.

## The queue

**The top level IS the priority queue**, no index file, and minute-resolution timestamps make one lexical sort the whole queue. `drafts/` is not the queue; `done/` is the archive and the undo. `logs/admitted.txt` lists what was promoted.

- `p0` drop-everything, `p1` urgent, `p2` normal, `p3` backlog. Default `p2` silently unless the user hinted at urgency.
- **Re-opening an unfinished item keeps the original filename**, so a rewrite never resets its queue position.

Template: `references/template.md` · Pitfalls, the ask inventory, the full checklist: `references/pitfalls.md` · Why the relay is shaped this way: `~/.claude/docs/handoff-relay.md`
