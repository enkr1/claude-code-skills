# Enqueue: pitfalls and full checklist

## Quick reference

| Situation | Do |
|---|---|
| Work finished and shipped | No handoff. Commit messages carry it. |
| Work unfinished, ending session | CLOSE the open doc, then `/clear` |
| Context nearly full, task alive | CLOSE, then `/clear`. Beats `/compact`, and the artifact outlives the session. |
| Same task, next day | CLOSE → `/clear` → `/dequeue <slug>` in the new session |
| Resuming an item mid-queue | `/dequeue <slug>`. Jumping the queue is allowed, silent starvation is not. |
| Reasoning worth keeping but task done | A memory or a plan doc, not a handoff |
| Work you will not touch for a week | A Google Task. Not a handoff doc. |

## Common mistakes

**Writing the doc at the end.** This is the one the write-through design exists to kill. A doc rebuilt at 150k context costs 15-20k tokens and re-verifies facts that were free to record when they landed. OPEN early, APPEND as you go.

**Using Edit to append.** Edit requires Reading the whole doc back into context first. That is roughly 7,000 tokens against 150 for `hd.sh`. The script exists for exactly this.

**Writing to a temp path.** `mktemp` output is gone tomorrow and invisible to search. It goes in `~/.claude/handoffs/`.

**Leading with history.** A successor's attention is spent top-down, so completed work sitting above the next action costs the most valuable part of it. History belongs under State, compressed.

**Passing speculation off as fact.** Writing "X is caused by Y" when Y was inferred, not checked, sends the successor down a path you never validated. Prefix it `**Unverified:**` or check it before it goes in.

**Copying what a file already holds.** Plans, diffs and issues are already durable. Link them. The handoff is only for what would otherwise be lost. The exception is acceptance criteria: when the next action is to check something, "correct" has to be stated, not linked.

**Ending without showing it.** The user cannot correct a document they have not seen, and after `/clear` it is too late.

**Letting the doc grow past 8KB.** At that size it is a spec wearing a handoff's clothes. Move it into the repo and point at it. If it is on its third round of amendments, the task is bigger than a session and needs splitting, not a better handoff.

## Full review checklist

The three questions in SKILL.md cover the common case. Use the full list when the work is unusually tangled, or when a previous handoff on this task already went wrong.

- Could you start work from Preflight plus Next action alone, and would you know when it is done?
- If you found the work half-finished, would you know whether to complete it or stop?
- Does every claim in State say how it was checked, and could that check actually prove it?
- Is anything asserted that you did not actually verify?
- Is anything here already in a file you could have pointed at instead?
- Does Preflight check the artifact the next action operates on, and does every mismatch land on an action rather than "look into it"?
- Is anything hedged in one section and asserted flatly in another?
- Does every ask the user made this session appear in the doc, or have a stated reason for not appearing?

## Recovering asks from a session that did not append as it went

Only needed when a doc was NOT maintained write-through, which should now be rare. Misses cluster past 200k context, exactly where recall is weakest, so read the session's own messages back off disk rather than recalling them:

```bash
jq -r -f ~/.claude/skills/enqueue/asks.jq ~/.claude/projects/*/<session-id>.jsonl
```

The session id is the last path segment of the scratchpad directory named in the system prompt. One output line is one message, and a single message routinely carries several separate asks, so work at the level of the ask rather than the line. Every ask gets disposed of out loud: carried into the doc, done this session, or dropped with a reason. An ask you cannot classify is carried, never dropped.

## Never `mktemp` for a handoff

A temp path is gone tomorrow, outside git, and invisible to conversation search, which is every property a handoff exists to have. Moved here from SKILL.md 2026-09-11 to make room for the close-time input check; the rule is unchanged.
