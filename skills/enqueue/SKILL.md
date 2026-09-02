---
name: enqueue
description: Queue unfinished work for a later session by writing a handoff doc into the priority queue. Use when work is unfinished and the session must end, before /clear on a live task, when context is nearly full, or when the user says "enqueue", "handoff", "写个交接", "pick this up later", or "I'll continue tomorrow". Paired with the dequeue skill, which pops and resumes queued items.
argument-hint: "What will the next session be used for? Optionally p0-p3 priority."
---

# Enqueue

Write the one document a fresh session needs to resume without re-deriving anything, and file it into the handoff queue. The paired `dequeue` skill pops it later.

**Core principle: the handoff carries what disk cannot.** Files, commits and plans survive on their own. What dies with the session is the reasoning: what you verified, what you ruled out, why the current approach beat the alternative. Capture that, reference the rest.

## Where it goes — the queue

Always here, whatever the project:

```bash
mkdir -p ~/.claude/handoffs/done
# → ~/.claude/handoffs/p<N>-$(date +%Y%m%d%H%M)-<slug>.md
#   e.g. p2-202608031845-parser-timeout-fix.md
```

`<slug>` is 2-4 kebab-case words naming the task, not the session.

**The directory IS the priority queue.** No index file, nothing to desync:

- A doc at the top level of `~/.claude/handoffs/` = a pending queue item.
- `p<N>` prefix = priority, industry P0-P3 convention: `p0` drop-everything, `p1` urgent, `p2` normal (default), `p3` backlog. Ask only if the user hinted at urgency; otherwise default `p2` silently.
- The timestamp is minute-resolution so two same-day enqueues still order. One lexical sort = the whole queue: lower p first, then oldest first within a priority. `ls ~/.claude/handoffs/p*.md | sort` shows the queue exactly as dequeue will see it.
- **Re-enqueueing an unfinished item rewrites the content but keeps the original filename.** The timestamp records when the task first entered the queue, so a rewrite never resets its position.
- Popping = `dequeue` moving the doc into `done/` once the work's Done-when condition is met. Enqueue never touches `done/`.
- **Owner-QA is not a queue item (owner, 2026-09-02).** When the only thing left is the owner testing it himself on his device or prod, the code side is done: pop the doc. He tests on his own time and files a NEW item if something breaks. Never enqueue or keep a doc whose Done-when is "the owner has looked at it"; put the check recipe in the closing report instead.

One directory for every project means an unfinished task is findable without remembering which repo it belonged to, and work that spans repos has one obvious home. Never `mktemp`: a temp path is gone tomorrow, outside git, and invisible to conversation search, which is every property a handoff exists to have.

## Verify before you write it down

A handoff repeats its own errors into the next session, so every factual claim gets checked against disk first: `git log --oneline -5`, the file exists, the branch is what you think, the test actually passes.

Label what you could not verify. `**Assumed:**` and `**Unverified:**` are load-bearing prefixes, and a successor acting on a guess dressed as a fact is the expensive failure. If a check surprises you, that surprise is one of the most valuable things in the document.

**A label travels with its fact.** Once something is marked unverified in State, it cannot appear unhedged anywhere else — a number hedged in one section and asserted flatly two sections later reads as established to anyone who skims, and skimming is exactly what a successor does.

**The citation has to prove the claim.** `git log --oneline` cannot establish a line count. A check that does not actually test what it sits next to launders a guess into a fact, which is worse than citing nothing: a bare claim invites doubt, a mis-cited one closes it off. Either run the check that proves it or write `**Per the commit message, not independently checked:**`.

## The document

Seven sections, in this order. Inverted pyramid: a successor who runs Preflight and reads Next action can start correctly without the rest.

```markdown
# Handoff: <task> (<date>)

## Preflight
Commands the successor runs first, in a shell block. Every check carries both
its expected result and what a mismatch means, on the line below it. A check
whose failure has no stated consequence is worse than no check: it halts the
successor without telling it anything.

Each consequence must land on an action — proceed, skip to step N, stop and
report. "Investigate further" is a deferral, not a consequence, and it sends
the successor hunting through the rest of the document for a verdict.

    git log --oneline -1 -- src/parser.ts    # expect a1b2c3d
    # different → someone committed since; read their diff before touching it
    test -d ~/work/thing/.worktrees          # expect missing
    # exists → the worktree survived; reuse it, do not create another

Cover at minimum the artifact the next action operates on.

## Next action
The single thing to do first, concrete enough to start on without deciding
anything. Then the 2-3 steps after it.
**Done when:** the condition that ends the whole block, observable enough to
tell finished from nearly-finished. Where a step is to review, verify or
finish something, its criteria go here in full — a successor holding only a
pointer has to re-derive what "correct" means before it can start.
**Authority:** what the successor may fix on its own versus what it must stop
and report. Say this explicitly for the partly-done case, since finding three
of five items already handled is the likeliest way reality differs.

## State (verified <date>)
What is true right now, each line carrying how it was checked.
- `feature/x` at a1b2c3d, 3 commits ahead of dev — `git log --oneline dev..HEAD`
- Migration applied locally, NOT on staging — checked local dev only
- **Unverified:** whether the nightly job picked up the new config
**If this does not match:** for anything Preflight does not already cover,
where to look, who decides, and whether to carry on regardless. A successor
that finds a different world needs a named next move, not a guess.

## Why it looks like this
Decisions a successor would otherwise reopen, each with its reason.
- Chose polling over webhooks: the vendor's callback needs a public URL
- Rejected caching the parsed result: invalidation needs a key we don't have

## Dead ends
What was tried and did not work, so it is not tried again.
- Bumping the timeout: still fails at 30s, so it is not a timeout
- `--legacy-peer-deps`: installs, then breaks at runtime on the same module

## Open questions
Genuinely undecided, with what would settle each one.
- Does X need to handle the empty case? Ask the user, or check prod data.

## Pointers
Artifacts, by path or URL, never copied in.
- Plan: `docs/superpowers/plans/2026-07-23-thing.md`
- Issue: #412 · Branch: `feature/x` · Failing test: `src/x.test.ts:88`
- Skills for the next session: `worktrees` to re-enter isolation, then `tdd`
```

Cut any section with nothing real in it. An empty "Dead ends" is honest; a padded one wastes the successor's first minutes.

## Before you finish

Read your own document first, as if you had no memory of the session, and **fix what the read turns up before showing it**. Finding a flaw and shipping it anyway is the one outcome this pass exists to prevent.

- Could you start work from **Preflight** plus **Next action** alone, and would you know when it is done?
- If you found the work half-finished, would you know whether to complete it or stop?
- Does every claim in **State** say how it was checked, and could that check actually prove it?
- Is anything asserted that you did not actually verify?
- Is anything here already in a file you could have pointed at instead?
- Does **Preflight** check the artifact the next action operates on, and does every mismatch land on an action rather than "look into it"?
- Is anything hedged in one section and asserted flatly in another?

Then hand it over in **one sentence plus the command, nothing else**:

```
Enqueued: re-run the failing parser test against the new timeout branch (p2-202608031845-parser-timeout-fix.md, #2 of 3)

/dequeue parser-timeout-fix
```

The sentence says what the next session picks up, not what this one did. Filename and position ride along in it; position comes from `ls ~/.claude/handoffs/p*.md | sort`. Then the command on its own line, carrying this item's own slug, copy-pasteable.

**The slug is not optional, even at #1.** A bare `/dequeue` pops the queue head, so on every enqueue that lands anywhere else it resumes a different task than the sentence above it just named, and the two lines contradict each other in the one place the user is most likely to copy blind.

No preamble, no summary of the handoff, no pasted sections, no explanation of how the queue works. The user sat through the session that produced this doc and the doc is one `cat` away, so anything past those two lines is reading it back to them. If the write surfaced something they must decide before the next session, that is one more sentence, not a paragraph.

## Quick reference

| Situation | Do |
|---|---|
| Work finished and shipped | No handoff. Commit messages carry it. |
| Work unfinished, ending session | Enqueue, then `/clear` |
| Context nearly full, task alive | Enqueue, then `/clear` — beats `/compact` by roughly 3x on cost, and the artifact outlives the session |
| Same task, next day | Enqueue → `/clear` → `/dequeue <slug>` in the new session |
| Resuming an item mid-queue | `/dequeue <slug>` — jumping the queue is allowed, silent starvation is not |
| Reasoning worth keeping but task done | A memory or a plan doc, not a handoff |

## Common mistakes

**Writing to a temp path.** `mktemp` output is gone tomorrow and invisible to search. It goes in `~/.claude/handoffs/`.

**Leading with history.** A successor's attention is spent top-down, so completed work sitting above the next action costs the most valuable part of it. History belongs under **State**, compressed.

**Passing speculation off as fact.** Writing "X is caused by Y" when Y was inferred, not checked, sends the successor down a path you never validated. Prefix it `**Unverified:**` or check it before it goes in.

**Copying what a file already holds.** Plans, diffs and issues are already durable. Link them. The handoff is only for what would otherwise be lost. The exception is acceptance criteria: when the next action is to check something, "correct" has to be stated, not linked.

**Ending without showing it.** The user cannot correct a document they have not seen, and after `/clear` it is too late.
