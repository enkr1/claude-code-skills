# Claude Code Skills

Skills I built for my own Claude Code workflow and kept reaching for. Sharing them here in case they help you too.

```
/plugin marketplace add enkr1/claude-code-skills
/plugin install enkr-skills@enkr-skills
```

## Skills

| Skill | What it does |
|-------|--------------|
| [**threads**](skills/threads/SKILL.md) | A branching task tracker that never drops a ball: per-chat trees, a global view, auto-reinjected so Claude never forgets. |
| [**commit**](skills/commit/SKILL.md) | Gitmoji and conventional commits, with anti-AI-signature rules. |

---

## ✦ threads: never lose a task thread again

A branching task tracker that lives inside Claude Code, built for ADHD and nonlinear work. You dump branching ideas faster than you can file them; threads captures each one into a tree, reminds Claude of your open threads on every prompt so it stops forgetting, and never drops a ball.

```
  threads · global                          2 chats · 5 open
  ───────────────────────────────────────────────────────────
  ◆ form-check · deploy
  ○ fix auth
  ├─ ○ write tests
▸ └─ ● deploy
  ◆ bakery · menu page
  ○ menu page
▸ └─ ● checkout flow
  ───────────────────────────────────────────────────────────
```

- **Per-chat trees:** each conversation is its own tree with its own "you are here" (`▸`). Chats never tangle.
- **Global zoom-out:** `threads global` shows every chat's open work, grouped by project.
- **Auto-reinjected:** a `UserPromptSubmit` hook feeds your open threads back into context every turn. This is the part a plain markdown skill cannot do, and it is why Claude stops forgetting parked work.
- **No dropped balls:** a task leaves the tree only when it is `done` or you kill it. Never silently. Stale ones are flagged, not deleted.

Glyphs: `▸` here, `●` active, `○` paused, `✓` done, `✕` blocked, `◦` snoozed.

### Use it by talking

"switch to X", "bt" / "backtrack", "done", "snooze X", "where am i", or just dumping new tasks all drive it. Or call the CLI directly:

```
threads  capture "<name>" | switch "<q>" | bt | done [q] | snooze "<q>" [days] | tree | global
```

### Install threads

```
/plugin marketplace add enkr1/claude-code-skills
/plugin install enkr-skills@enkr-skills
node ~/.claude/skills/threads/install.mjs   # wires the hook, then restart Claude Code
```

> **Why the extra step:** plugin-defined hooks cannot inject context yet ([claude-code#12151](https://github.com/anthropics/claude-code/issues/12151)), so `install.mjs` adds the `UserPromptSubmit` hook to your `settings.json` (backed up, append-only, idempotent). To uninstall, delete that one hook block.

### Statusline (optional)

threads ships a one-line "where am i" for the Claude Code statusline (`statusline/threads-statusline.mjs`). To show it, add this to your statusline script, passing the chat's `session_id`:

```bash
SID=$(jq -r '.session_id // empty')
TH=$(THREADS_SESSION="$SID" node ~/.claude/skills/threads/statusline/threads-statusline.mjs 2>/dev/null)
if [ -n "$TH" ] && [ "$TH" != "threads: idle" ]; then printf "\n%s" "$TH"; fi
exit 0
```

> **The `exit 0` is not optional.** If a statusline script exits non-zero, Claude Code blanks the entire bar. A trailing `&&` chain that short-circuits when there is nothing to show is an easy way to exit 1 by accident, so always end the script with `exit 0`. If `node` is not on the statusline's PATH (for example under nvm), use the absolute node path.

Local-first: state is a single JSON file at `~/.claude/threads.json`. No network, no account.

---

## ✦ commit: gitmoji + conventional commits

| Skill | Description |
|-------|-------------|
| [commit](skills/commit/SKILL.md) | Gitmoji + conventional commits with anti-AI-signature rules |

Enforces a clean, single-line format `<emoji> <type>(<scope>): <description>`, with a "Must Look Human" section that strips `Co-Authored-By` and "Generated with Claude Code" so commits read like you wrote them.

```
✨ feat(auth): add OAuth2 PKCE flow for mobile clients
🐛 fix(api): prevent race condition on concurrent profile updates (#163)
```

---

## Contributing

Skills that solve real problems are welcome.

1. Fork this repo
2. Create `skills/<your-skill-name>/SKILL.md` ([Agent Skills Spec](https://github.com/anthropics/skills/blob/main/spec/skill-authoring.md))
3. Open a PR describing the problem it solves, example usage, and why it beats doing it by hand

**Quality bar:** opinionated (take a stance), compact (under 500 words; reference docs in a `references/` subdir), no secrets, and actually tested across sessions.

## Prior art and inspiration

threads is far from the first to think about this. With thanks to the work it learned from or shares ideas with:

- **[Discovery Trees](https://softwareascraft.com/adhd/discovery-trees-visualizing-tasks/)** articulate the ADHD branching-task pattern (branch off a tangent, return to the parent when it is done). That is the mental model threads automates.
- **[Beads](https://github.com/steveyegge/beads)** by Steve Yegge treats a dependency graph as agent memory, the bar for durable, agent-owned task state.
- **[Task Master](https://github.com/eyaltoledano/claude-task-master)** and **[Claude Code PM](https://github.com/automazeio/ccpm)** are prior art for task management inside Claude Code.
- Claude Code's **[hooks](https://code.claude.com/docs/en/hooks)** (`UserPromptSubmit` context injection) are what make the every-turn reinjection possible.

Missed an attribution? Open an issue and I will add it.

## License

MIT
