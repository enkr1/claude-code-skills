---
name: threads
description: ADHD-friendly branching task tracker. Use when the user dumps multiple or branching requests, switches tasks, says "bt" / "backtrack" / "switch to" / "where am i" / "done" / "snooze", or whenever work threads should be captured or resumed so nothing gets dropped. Auto-captures every actionable request into a persistent tree with a priority queue.
---

# threads

A persistent, branching task tree so neither you nor the user loses track of work. The user has ADHD and dumps branching ideas faster than they can file them; your job is to file them so nothing is dropped. State lives at `~/.claude/threads.json`. Drive it with the CLI, never hand-edit the JSON.

**Per-chat by default:** each chat is its own tree with its own `current` (scoped by `CLAUDE_CODE_SESSION_ID`), so chats never tangle. `tree` shows THIS chat; `global` zooms out to every chat's tree.

Run the CLI with node:

```
node ~/.claude/skills/threads/bin/threads.mjs <command>
```

## The discipline (no dropped balls)

- When the user states an actionable request, `capture` it. Several requests in one message means several captures.
- A request blurted while you are mid-task auto-nests as a child of the current task.
- A task leaves the tree only two ways: `done`, or the user explicitly kills it. Never silently.
- After capturing, keep doing what the user actually asked. The rest wait in the queue, surfaced 1-3 at a time, never the whole backlog.

## Commands

| Command | Does |
|---|---|
| `capture "<name>"` | file a new task (auto-nests under current) |
| `switch "<query>"` | resume an existing task by name |
| `bt` / `backtrack` | return to the parent task |
| `done ["<query>"]` | complete the current (or matched) task |
| `snooze "<query>" [days]` | defer a task; it resurfaces later |
| `tree` | this chat's tree (the `▸` marks where you are) |
| `global` | every chat's tree, grouped by project (zoom out) |
| `context` | compact state (the hook injects this each turn) |
| `statusline` | one-line status |

## Triggers

- "bt", "backtrack", "go back" -> `bt`
- "switch to X", "back to X" -> `switch "X"`
- "done", "finished", "that's fixed" -> `done`
- "snooze X", "not now", "later" -> `snooze "X"`
- "where am i", "show tree", "what's open" -> `tree`
- the user dumps one or more new tasks -> `capture` each

## Glyphs (emoji-free, single-width so columns align)

`▸` here · `●` active · `○` paused · `✓` done · `✕` blocked · `◦` snoozed

## Keep upkeep invisible

The user will not maintain this manually. Capture silently as part of doing the work; do not narrate the bookkeeping. Surface the tree only when asked or when resuming.
