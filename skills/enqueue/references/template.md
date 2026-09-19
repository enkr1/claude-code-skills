# Handoff: <task> (<date>)

Seven sections, inverted pyramid. A successor who runs Preflight and reads Next action can start correctly without the rest. Cut any section with nothing real in it: an empty "Dead ends" is honest, a padded one wastes the successor's first minutes.

## Preflight

Commands the successor runs first, in a shell block. Every check carries both its expected result and what a mismatch means, on the line below it. A check whose failure has no stated consequence is worse than no check, because it halts the successor without telling it anything.

Each consequence must land on an action: proceed, skip to step N, stop and report. "Investigate further" is a deferral, not a consequence, and it sends the successor hunting through the rest of the document for a verdict.

    git log --oneline -1 -- src/parser.ts    # expect a1b2c3d
    # different → someone committed since; read their diff before touching it
    test -d ~/work/thing/.worktrees          # expect missing
    # exists → the worktree survived; reuse it, do not create another

Cover at minimum the artifact the next action operates on.

**`**Branch:** <name>` on its own line whenever the work has a branch.** It is the only link from a merged branch back to this doc, and the `worktrees` finishing step greps the queue for it to ack the doc when the branch lands. Without it, the session that finishes the work never learns a doc is waiting: three merged items sat queued as pending on 2026-09-10 for exactly this.

**`**Source session:** <id>` on its own line, always.** It is the only link back to the discussion the doc came out of, and the successor reads it with `jq -rn -f ~/.claude/skills/enqueue/asks.jq` when Decisions or Why turn out thin. The id is the last path segment of the scratchpad directory named in the system prompt.

## Next action

The single thing to do first, concrete enough to start on without deciding anything. Then the 2-3 steps after it.

**Done when:** the condition that ends the whole block, observable enough to tell finished from nearly-finished. Where a step is to review, verify or finish something, its criteria go here in full: a successor holding only a pointer has to re-derive what "correct" means before it can start.

**Authority:** what the successor may fix on its own versus what it must stop and report. Say this explicitly for the partly-done case, since finding three of five items already handled is the likeliest way reality differs.

## Decisions

What the user decided out loud, in their own words, and what each one changes. Disk cannot verify these, so the source is the transcript and every line says so.

- **Said, not on disk:** ship the banner now, do not wait on the copy review. Supersedes the "blocked on copy" gate under State.

## State (verified <date>)

What is true right now, each line carrying how it was checked.

- `feature/x` at a1b2c3d, 3 commits ahead of dev, per `git log --oneline dev..HEAD`
- Migration applied locally, NOT on staging, checked local dev only
- **Unverified:** whether the nightly job picked up the new config

**If this does not match:** for anything Preflight does not already cover, where to look, who decides, and whether to carry on regardless. A successor that finds a different world needs a named next move, not a guess.

## Why it looks like this

Decisions a successor would otherwise reopen, each with its reason.

- Chose polling over webhooks: the vendor's callback needs a public URL
- Rejected caching the parsed result: invalidation needs a key we do not have

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
