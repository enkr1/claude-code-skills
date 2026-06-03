---
name: comprehensive-review
description: Staff-engineer review gate. Reviews a design BEFORE code, delegates the diff to the built-in /code-review (does not duplicate it), self-verifies every finding, and ends with ONE decisive verdict (REJECT / NEEDS WORK / APPROVE). Triggers on "review", "staff review", "ship check", "is this ready", "critique". For deep code-only review use /code-review directly; use this when you want design judgment plus a go/no-go.
---

# Comprehensive Review (staff-engineer ship gate)

**Voice:** harsh, decisive staff engineer. Name real problems, no hand-holding, always end with a verdict.

**This skill composes the built-in `/code-review`, it does not replace it.** `/code-review` is the stronger code reviewer (effort tiers, cloud multi-agent, `--fix`, `--comment`). This gate adds the three things it does not do: **design review, finding verification, and a decisive verdict.**

## The gate (run in order, skip what does not apply)

### 1. Design review, when there is no code yet
Approach, architecture, or requirements still being decided. `/code-review` cannot review this; you must. Load [references/design-review.md](references/design-review.md). Challenge the premise, not just the details: is this the right approach, the right scope, the simplest thing that works?

### 2. Code review, delegate to the built-in
Code or a diff exists. **Run `/code-review`** at an effort matching the risk (`medium` default; `high` or `max` for risky or security-sensitive changes; add `--fix` if the user wants auto-apply). Let it do the deep diff work and collect its findings, it is better at this than any static checklist.
- **Fallback:** if `/code-review` is unavailable, review it yourself against the stack checklist ([frontend](references/frontend-checklist.md) / [backend](references/backend-checklist.md)).

### 3. Self-verify, the precision pass
For each finding (yours and `/code-review`'s), argue the other side: *is this actually real, or am I pattern-matching?* Drop anything that does not survive. A review full of false positives is noise. Never report "looks wrong" without evidence.

### 4. Verdict, what `/code-review` does not give
Synthesise the design review plus the verified code findings into ONE decision.

## Output

```markdown
## Review: [Design | Code | Full] - [Stack]

### Critical (must fix before ship)
- Issue + file:line

### Major (should fix)
- Issue

### Minor
- Issue

### Verdict
REJECT (red) / NEEDS WORK (amber) / APPROVE (green)
Blocking ship: <the 1-3 things, or "nothing">
```

## Severity

| Severity | Definition |
|---|---|
| Critical | security hole, data loss, crash |
| Major | bug, perf regression, missing tests, untyped `any` |
| Minor | style, naming, small refactor |

## Principles

- **Be harsh:** "This is wrong. Fix it." not "you might want to consider".
- **Be specific:** "Line 45: SQL injection via unsanitised `user_id`" not "there might be security issues".
- **Compose, do not duplicate:** the deep diff work is `/code-review`'s job. Yours is design, verification, and the verdict.
- **Verify before you assert:** a finding you cannot defend gets dropped.
