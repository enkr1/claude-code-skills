# Claude Skills

Community-driven skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Skills

| Skill | Description |
|-------|-------------|
| [commit](skills/commit/SKILL.md) | Gitmoji + conventional commits with anti-AI-signature rules |

## Install

```bash
/plugin marketplace add enkr1/claude-skills
/plugin install enkr-skills@enkr-skills
```

## What's the `commit` skill?

Enforces a clean, single-line commit format:

```
<emoji> <type>(<scope>): <description>
```

**Example output:**
```
✨ feat(auth): add OAuth2 PKCE flow for mobile clients
🐛 fix(api): prevent race condition on concurrent profile updates (#163)
♻️ refactor(ui): CSS-first approach for card and form components
```

**The differentiator:** a "Must Look Human" section that strips AI signatures — no `Co-Authored-By`, no `Generated with Claude Code`, no bot emoji. Your commits look like *you* wrote them.

## Contributing

Skills that solve real problems are welcome. If you've built a skill that helps your workflow, others probably need it too.

### Adding a skill

1. Fork this repo
2. Create `skills/<your-skill-name>/SKILL.md`
3. Follow the [Agent Skills Spec](https://github.com/anthropics/skills/blob/main/spec/skill-authoring.md) — YAML frontmatter with `name` + `description`, then markdown body
4. Open a PR with:
   - What problem the skill solves
   - Example usage / output
   - Why it's better than doing it manually

### Skill quality bar

- **Opinionated** — generic "follow best practices" skills aren't useful. Take a stance.
- **Compact** — aim for <500 words. If it needs reference docs, put them in a `references/` subdirectory.
- **No secrets** — no hardcoded paths, API keys, project-specific config. Use variables or config sections if needed.
- **Tested** — you've actually used it across multiple sessions.

### Improving existing skills

Found an edge case? Better phrasing? Missing emoji type? PRs to improve existing skills are just as valuable as new ones.

## License

MIT
