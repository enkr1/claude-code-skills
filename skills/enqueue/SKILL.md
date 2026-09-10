---
name: enqueue
description: Queue unfinished work for a later session by writing a handoff doc into the priority queue. Use when work is unfinished and the session must end, before /clear on a live task, when context is nearly full, or when the user says "enqueue", "handoff", "写个交接", "pick this up later", or "I'll continue tomorrow". Paired with the dequeue skill, which pops and resumes queued items.
argument-hint: "What the next session picks up. Optionally p0-p3 priority."
---

# Enqueue

The handoff doc is written DURING the work, never reconstructed at the end.

Reconstructing it at the end is a flush penalty paid at the most expensive point in the session, and it forces a second verification pass over facts that were already cheap to check when they landed. Measured 2026-09-09: the end-of-session rebuild cost 15-20k tokens and reliably overshot the very clear-threshold it was meant to respect.

**The handoff carries what disk cannot.** Files, commits and plans survive on their own. What dies with the session is the reasoning: what you verified, what you ruled out, why the current approach beat the alternative. Capture that, reference the rest.

## OPEN, once

As soon as work looks like it will outlive the session. Not at the end.

```bash
mkdir -p ~/.claude/handoffs/done
cp ~/.claude/skills/enqueue/references/template.md \
   ~/.claude/handoffs/p2-$(date +%Y%m%d%H%M)-<slug>.md
```

`<slug>` is 2-4 kebab-case words naming the task, not the session.

**Only open a doc for work you will resume within 72 hours.** Anything further out is a Google Task, not an 8KB document with a verified-state section. A doc that is never dequeued cost its full write price and returned nothing.

## APPEND, continuously

The moment a fact is verified, a decision is made, an approach is ruled out, or your own work makes an earlier line FALSE (append to that same section, leading with `SUPERSEDES`):

```bash
~/.claude/scripts/hd.sh <slug> state 'migration applied locally, NOT on staging, checked local dev only'
~/.claude/scripts/hd.sh <slug> decision 'Said, not on disk: ship the banner now, do not wait on copy review'
~/.claude/scripts/hd.sh <slug> deadend 'bumping the timeout: still fails at 30s, so it is not a timeout'
```

Sections: `decision` `state` `deadend` `question` `pointer` `why` `next`. The script fails closed on an unknown or ambiguous slug, and never creates a doc.

**Append with the script, never with Edit.** Edit requires Reading the whole doc back first, which is the exact cost this design removes. An append is roughly 150 tokens against 7,000.

Write the fact when you verify it and the citation is free. Write it at the end and you are paying to re-derive what you already knew.

## Verification labels

`**Assumed:**` and `**Unverified:**` are load-bearing. A successor acting on a guess dressed as a fact is the expensive failure.

**A label travels with its fact.** Once something is hedged in State it cannot appear flat anywhere else, because skimming is exactly what a successor does.

**The citation has to prove the claim.** `git log --oneline` cannot establish a line count. Either run the check that proves it, or write `**Per the commit message, not independently checked:**`.

## CLOSE, at end of session

The doc is already current, so closing is not a rebuild.

1. Set **Next action**, its **Done when**, and its **Authority**. This is the one section that must be rewritten, because it is the only one describing the future. `hd.sh <slug> next --replace '<body>'` does it without Reading the doc back; include your own **Done when:** line in the body to rewrite the trailers too.
2. Run the **Preflight** block once and fix any check that no longer holds.
3. Read the doc as if you had no memory of the session, and fix what that read turns up before showing it. Finding a flaw and shipping it anyway is the one outcome this pass exists to prevent.

Three questions, not eight:

- Could you start from Preflight plus Next action alone, and would you know when it is done?
- If you found the work half finished, would you know whether to continue or stop?
- Is anything asserted that you did not actually verify?

**Cap the doc at 8KB.** Past that it is a spec, not a handoff: move it into the repo and leave the handoff pointing at it. A doc that keeps growing across rounds means the task is bigger than one session, which is a scoping problem no handoff can fix.

Then hand over in one sentence plus the command, nothing else:

```
Enqueued: re-run the failing parser test against the new timeout branch (p2-202608031845-parser-timeout-fix.md, #2 of 3)

/dequeue parser-timeout-fix
```

**The slug is not optional, even at #1.** A bare `/dequeue` pops the queue head, so anywhere else it resumes a different task than the sentence above it just named, and the two lines contradict each other exactly where the user is most likely to copy blind.

No preamble, no summary of the handoff, no pasted sections. The user sat through the session that produced this doc and the doc is one `cat` away.

## The queue

**The directory IS the priority queue.** No index file, nothing to desync.

- A doc at the top level of `~/.claude/handoffs/` is a pending item. `p0` drop-everything, `p1` urgent, `p2` normal (default), `p3` backlog. Default `p2` silently unless the user hinted at urgency.
- Minute-resolution timestamps mean one lexical sort is the whole queue: `ls ~/.claude/handoffs/p*.md | sort`.
- **Re-opening an unfinished item keeps the original filename.** The timestamp records when the task first entered the queue, so a rewrite never resets its position.
- Popping is `dequeue` moving the doc into `done/`. Enqueue never touches `done/`.
- **Owner-QA is not a queue item (owner, 2026-09-02).** When the only thing left is the owner testing it himself on his device or prod, the code side is done: pop the doc. He files a new item if something breaks. Put the check recipe in the closing report instead.
- **Never `mktemp`.** A temp path is gone tomorrow, outside git, and invisible to conversation search, which is every property a handoff exists to have.

Document template: `references/template.md`
Pitfalls, quick-reference table, the full review checklist: `references/pitfalls.md`
