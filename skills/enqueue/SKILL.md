---
name: enqueue
description: Queue unfinished work for a later session by writing a handoff doc into the priority queue. Use when work is unfinished and the session must end, before /clear on a live task, when context is nearly full, or when the user says "enqueue", "handoff", "写个交接", "pick this up later", or "I'll continue tomorrow". Paired with the dequeue skill, which pops and resumes queued items.
argument-hint: "What the next session picks up. Optionally p0-p3 priority."
---

# Enqueue

The handoff doc is written DURING the work, never reconstructed at the end.

Reconstructing it at the end is a flush penalty at the session's most expensive point, and it re-verifies facts that were cheap to check when they landed. Measured 2026-09-09: the rebuild cost 15-20k tokens and overshot the clear-threshold it was meant to respect.

**The handoff carries what disk cannot.** Files, commits and plans survive on their own. What dies is the reasoning: what you verified, what you ruled out, why this approach beat the alternative. Capture that, reference the rest.

## OPEN, once

As soon as work looks like it will outlive the session. Not at the end.

**Before the cp: a decision, a design or a todo list goes into the repo's `docs/feature-<name>.md` FIRST, and the handoff carries the pointer.** Re-affirmed by the owner 2026-09-17 after a handoff was offered with the design inside it; the full rule is under CLOSE, this line is here because OPEN is where the mistake is made.

```bash
mkdir -p ~/.claude/handoffs/done
cp ~/.claude/skills/enqueue/references/template.md \
   ~/.claude/handoffs/p2-$(date +%Y%m%d%H%M)-<slug>.md
```

`<slug>` is 2-4 kebab-case words naming the task, not the session.

**Only open a doc for work you will resume within 72 hours.** Anything further out is a Google Task. A doc never dequeued cost its full write price and returned nothing.

## APPEND, continuously

The moment a fact is verified, a decision is made, an approach is ruled out, or your own work makes an earlier line FALSE (append to that same section, leading with `SUPERSEDES`):

```bash
~/.claude/scripts/hd.sh <slug> state 'migration applied locally, NOT on staging, checked local dev only'
~/.claude/scripts/hd.sh <slug> decision 'Said, not on disk: ship the banner now, do not wait on copy review'
~/.claude/scripts/hd.sh <slug> deadend 'bumping the timeout: still fails at 30s, so it is not a timeout'
```

Sections: `decision` `state` `deadend` `question` `pointer` `why` `next`. The script fails closed on an unknown or ambiguous slug, and never creates a doc.

**Append with the script, never with Edit.** Edit Reads the whole doc back first, the exact cost this design removes: ~150 tokens against 7,000.

## Verification labels

`**Assumed:**` and `**Unverified:**` are load-bearing. A successor acting on a guess dressed as a fact is the expensive failure.

**A label travels with its fact.** Hedged in State, it cannot appear flat elsewhere; skimming is what a successor does.

**The citation has to prove the claim.** `git log --oneline` cannot establish a line count. Either run the check that proves it, or write `**Per the commit message, not independently checked:**`.

## CLOSE, at end of session

The doc is already current, so closing is not a rebuild.

1. Set **Next action**, its **Done when**, and its **Authority**. This is the one section that must be rewritten, because it is the only one describing the future. `hd.sh <slug> next --replace '<body>'` does it without Reading the doc back; include your own **Done when:** line in the body to rewrite the trailers too.
2. Run the **Preflight** block once and fix any check that no longer holds.
3. Read the doc as if you had no memory of the session, and fix what that read turns up before showing it. Finding a flaw and shipping it anyway is the one outcome this pass exists to prevent.

Four questions, not eight:

- Could you start from Preflight plus Next action alone, and would you know when it is done?
- If you found the work half finished, would you know whether to continue or stop?
- Is anything asserted that you did not actually verify?
- **Does every input Next action needs already exist?** Name the source of each number, field, endpoint and file it tells the successor to use. A step lifted from a mock or a design round is the usual failure: the mock had fake data, so the step reads as buildable while nothing in the app produces it.

**An open question with no default is a blocker; decide it at close.** Either record the call and the reasoning, or put it in Authority and say in Next action's first line that the work stops until the owner answers. Parked with neither, the successor stalls on a doc that looked complete.

**A handoff holds SESSION STATE, never a specification** (owner, 2026-09-11): where you were standing, preflight, the branch, what is half-applied, the one next action. Decisions, vocabulary and design go in the repo's `docs/feature-<name>.md` and the handoff POINTS at it. The test is whether the content survives the task finishing: "the stamp already ran on prod" dies with it, "delivery starts a package, not payment" does not. **Cap 8KB**, past which it is a spec: move it into the repo and point. A doc that grows across rounds means the task is bigger than one session, which no handoff can fix.

Then hand over in one sentence plus the command, nothing else:

```
Enqueued: re-run the failing parser test against the new timeout branch (p2-202608031845-parser-timeout-fix.md, #2 of 3)

/dequeue parser-timeout-fix
```

**The slug is not optional, even at #1.** A bare `/dequeue` pops the queue head, so anywhere else it resumes a different task than the sentence just named, exactly where the user is most likely to copy blind.

No preamble, no summary, no pasted sections: the user sat through the session and the doc is one `cat` away.

## The queue

**The directory IS the priority queue.** No index file, nothing to desync.

- A doc at the top level of `~/.claude/handoffs/` is a pending item. `p0` drop-everything, `p1` urgent, `p2` normal (default), `p3` backlog. Default `p2` silently unless the user hinted at urgency.
- Minute-resolution timestamps mean one lexical sort is the whole queue: `ls ~/.claude/handoffs/p*.md | sort`.
- **Re-opening an unfinished item keeps the original filename**, so a rewrite never resets its queue position.
- Popping is `dequeue` moving the doc into `done/`; enqueue never touches it.
- **Owner-QA is not a queue item (owner, 2026-09-02).** When the only thing left is the owner testing it himself on his device or prod, the code side is done: pop the doc. He files a new item if something breaks. Put the check recipe in the closing report instead.

Document template: `references/template.md`
Pitfalls, quick-reference table, the full review checklist: `references/pitfalls.md`
