# threads (design spec)

Date: 2026-06-02
Status: design, pending user review
Author: enkr1

> Name confirmed `threads` (2026-06-02). Supersedes the existing manual `task-tree` skill; retire that one to avoid trigger collision on `backtrack`.

## Problem

ADHD-style nonlinear work. The user dumps branching tasks faster than they can file them: deep in task A, blurts "also need D", jumps to B, comes back to A, spins C off A, and D actually belonged under B. Today two things break:

1. Claude forgets open threads once they fall out of the context window, so dropped requests are lost.
2. The existing `task-tree` skill is manual (`/task push`), so in practice it captures nothing, and it silently deletes anything older than 24h, eating real parked work.

## Goal / success criteria

- **No dropped balls.** Every actionable request is captured and leaves the queue only two ways: done, or explicitly killed. Never silently.
- **Claude never forgets.** Open state is reinjected into context every turn.
- **Near-zero upkeep.** Capture is fully automatic. Priority is agent-drafted, overridable in one sentence.
- **Always visible.** A statusline shows current task plus what is next.
- **Durable + global.** Persists across sessions and projects; view scoped to the current project by default.

## Non-goals (v1)

Cross-project priority intelligence, recurring tasks, numeric scoring engines. (Captured for later, see Future.)

## Architecture (4 parts)

1. **Tree file** `~/.claude/threads.json` (global). Single source of truth. Two views derived from the same nodes: a **tree** (how ideas relate / provenance) and a **queue** (ranked, what is next).
2. **`UserPromptSubmit` hook** in `~/.claude/settings.json` (must be settings.json, not a plugin: plugin hooks do not inject context, bug anthropics/claude-code#12151). Every message it: reads the file fresh, injects a **compact** summary (current task + top 3 queue + open-branch count, not the whole tree), and carries a standing instruction: "if this message adds / switches / branches work, update threads.json; if it signals completion, close it; keep the queue ranked." Hook reads and injects; Claude writes the file during its turn. That loop is what makes it automatic.
3. **Statusline** reads the same file: `🎯 fixing-auth · next: D, B (+3 parked)`, scoped to the current project.
4. **Commands / skill** for precise control: `/threads` (full tree view), plus natural-language overrides ("do D first", "D belongs under B", "done", "snooze D till tomorrow").

   **Triggers (user muscle-memory):** `backtrack` and `bt` (shorthand) for pop / return to parent; `/threads` and `/bt` as commands; natural language for the rest ("switch to X", "where am i", "done with this"). `backtrack` currently fires the legacy `task-tree` skill, so that skill is retired or its triggers stripped when `threads` ships.

## Data model

```json
{
  "current": "task-id | null",
  "nodes": {
    "task-id": {
      "id": "string",
      "name": "string",
      "project": "cwd or repo slug",
      "parent": "task-id | null",
      "children": ["task-id"],
      "status": "active | paused | blocked | snoozed | done",
      "blockedBy": "task-id | null",
      "priority": "agent-drafted rank or bucket",
      "started": "ISO",
      "lastTouched": "ISO",
      "snoozeUntil": "ISO | null"
    }
  }
}
```

Queue is derived from nodes, not stored separately.

## Behaviors

- **Capture (auto).** Split one message into N nodes when it carries multiple asks. File each under the inferred parent. Dedupe against existing open nodes (re-raising "the auth thing" bumps it, never duplicates). Bias toward capturing (a stray node is cheaper than a dropped ball); ignore questions and reactions ("how does X work?", "ugh lol").
- **Prioritize (auto + override).** Draft order = dependencies first, then urgency words you naturally drop ("blocking", "quick", "someday"), then recency as tiebreak. Surface only the **next 1-3**, never the whole backlog. User overrides in a sentence.
- **Lifecycle (option C).** Auto-close obvious completions; manual "done" anytime; staleness is a **flag, never a silent delete**: untouched > N days (default 7) surfaces "still need this? (y/n)" before pruning. **Snooze** = defer and resurface, distinct from kill.
- **Re-entry.** Session start greets: "here is where you were · next: X."
- **v1 extras (cheap, high ADHD-leverage).** Time-blindness nudge ("heads-down on A for 2h, B and C still parked", free from timestamps). Speaks in the user's casual lowercase voice. Small dopamine acknowledgment on close.

## Reliability / risks

- **Write reliability.** Instruction-enforced via the every-turn reinjection (which is also the second-chance net if one turn misses a capture). Harden with a Stop-hook reconciliation pass only if it proves flaky. Not pre-built (YAGNI).
- **Concurrency (multiple sessions).** The user runs several windows at once. Mitigation: read fresh every turn, atomic writes (temp then rename), `lastTouched` so newest wins. Upgrade to an append-only event log only if clobbering shows up.
- **Token cost.** Inject the compact summary only; archive completed nodes out of the active file so it stays small.
- **Corruption.** Atomic write plus a last-good backup. Losing the tree would destroy trust.

## Distribution

- Home: `claude-code-skills` (rename of `claude-skills`), a public Claude Code plugin + marketplace.
- Develop in that repo, symlink into `~/.claude/skills/` so it runs live (the pattern already used for `claude-md-improver`). Private skills and `settings.json` stay in the private `claude-config` repo. Never merge config into the public repo.
- **Distribution caveat:** because plugin hooks do not inject (#12151), the public release ships a tiny installer that writes the `UserPromptSubmit` hook into the user's `settings.json`. The skill, statusline, and commands package normally.

## Open items

- **Name: resolved -> `threads`** (2026-06-02). Triggers include `backtrack` + `bt`.
- **Staleness window: resolved -> 7 days** before it asks "still need this?".
- **Retire legacy `task-tree`** when `threads` ships (trigger collision on `backtrack`).
- **Repo rename + symlink migration** of the other 28 skills and de-duping `commit`. Separate task, parked.

## Future (v2+)

Brain-dump mode (fire many, act on none, triage after), daily / session scorecard, avoidance detection ("you keep dodging D"), git-branch / issue auto-link, export, interrupt-guard ("6 open, start a 7th?").
