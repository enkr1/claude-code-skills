---
name: commit
description: Use when committing code changes — enforces gitmoji + conventional commit format with anti-AI-signature rules for human-looking commits
license: MIT
---

# Conventional Commit with Gitmoji

## Format

```
<emoji> <type>(<scope>): <comprehensive description>
```

Single line. No body unless explicitly needed for breaking changes.

## Emoji → Type Mapping

| Emoji | Type | When to Use |
|-------|------|-------------|
| ✨ | `feat` | New feature or capability |
| 🐛 | `fix` | Bug fix |
| ♻️ | `refactor` | Code restructure without behavior change |
| 📝 | `docs` | Documentation only |
| ✅ | `test` | Adding or updating tests |
| ⚡️ | `perf` | Performance improvement |
| 🎨 | `style` | Code formatting, no logic change |
| 🔧 | `chore` | Config, dependencies, tooling |
| 🔥 | `remove` | Removing code or files |
| 🚀 | `deploy` | Deployment related |
| ⏪️ | `revert` | Reverting changes |

## Scopes

Derive from the changed files — directory name, feature area, or module. Omit for project-wide changes.

## Description Guidelines

**Be comprehensive in one line:**
- State WHAT changed AND WHY if non-obvious
- Use imperative mood ("add", "fix", "prevent", not "added", "fixed")
- Include the user impact when relevant

**Good:**
```
✨ feat(auth): add OAuth2 PKCE flow for mobile clients
🐛 fix(api): prevent race condition on concurrent profile updates (#163)
♻️ refactor(ui): CSS-first approach for card and form components
```

**Bad:**
```
fix: bug fix                     # Too vague
✨ feat: added new feature       # Past tense, no scope, no description
🐛 fix(ui): fix issue            # Redundant, no actual description
```

## PR References

Append issue/PR number when closing or referencing:

```
🐛 fix(api): preserve metadata field when updating resource name (#151)
```

## Must Look Human

- NEVER add `Co-Authored-By` lines
- NEVER add `Generated with Claude Code` or similar
- NEVER use 🤖 emoji
- NEVER start with "This commit..." or "This change..."
- NEVER add bullet-point lists in commit body
- Keep it short, casual, imperfect. One line when possible.
