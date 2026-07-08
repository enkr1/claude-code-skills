# Issue Comment & Description Templates

## Description Upsert

### When to Upsert Description
- Issue has minimal/placeholder description → Add planning
- Issue has user's feedback only → Preserve original + add planning section
- Issue already has comprehensive plan → Skip upsert

### Description Template (Planning)

```markdown
## Context
[What triggered this work and why it matters]

## Approach
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

---
*Original issue:*
> [Preserved original description if any]
```

---

## Progress Comments

### Phase Tags
Use these tags to categorize comments:

| Tag | Use Case |
|-----|----------|
| `[Planning]` | Initial approach, design decisions |
| `[Investigation]` | Root cause analysis, debugging |
| `[Blocker]` | Blocked by dependency, waiting on info |
| `[Progress]` | Milestone reached, partial completion |
| `[Discovery]` | Unexpected complexity, scope change |
| `[Question]` | Need clarification |

### Progress Comment Template

```markdown
### [Tag] Title

**Status:** [What's done / what's next]

**Details:**
[Explanation of finding/decision/blocker]

**Next Steps:**
- [ ] [Action 1]
- [ ] [Action 2]
```

### Example: Discovery Comment

```markdown
### [Discovery] Scope larger than expected

**Status:** Found 3 additional components affected

**Details:**
Initial analysis showed only `ComponentA` needed changes.
During implementation, discovered:
- `ComponentB` shares same pattern
- `ComponentC` has dependency on the same hook
- Test coverage is missing for all three

**Next Steps:**
- [ ] Update all 3 components
- [ ] Add missing test coverage
- [ ] Update estimate to reflect scope
```

### Example: Blocker Comment

```markdown
### [Blocker] Waiting on backend API

**Status:** Frontend ready, blocked on API deployment

**Details:**
Implemented UI changes for #123.
Backend PR #456 needs to deploy before we can test E2E.

**Blocked by:** backend#456
**ETA:** [When expected to unblock]
```

---

## Wrap-up Comment

Add when work is complete (before closing issue).

### Template

```markdown
## ✅ Wrap-up

### Summary
[1-2 sentences: what was done and the outcome]

### Changes Made
- `path/to/file.ts` — [what changed]
- `path/to/other.ts` — [what changed]

### Key Takeaway
> When [context], always [action], not [anti-pattern].

### Learnings
- [Technical insight 1]
- [Technical insight 2]

### Reflection
- **What went well:** [What worked]
- **What could improve:** [What to do differently next time]

---
*Time spent: ~[X] hours | Complexity: [Simple/Medium/Complex]*
```

### Example: Bug Fix Wrap-up

```markdown
## ✅ Wrap-up

### Summary
Fixed race condition in auth token refresh that caused intermittent 401 errors.

### Changes Made
- `src/lib/auth.ts:45-62` — Added mutex lock around token refresh
- `src/lib/http.ts:120-135` — Queue requests during refresh
- `src/lib/__tests__/auth.test.ts` — Added race condition test

### Key Takeaway
> When multiple requests can trigger token refresh, always use a mutex to prevent parallel refresh calls, not independent refresh per request.

### Learnings
- Token refresh is a critical section requiring synchronization
- The 401 handler was being called by each failed request independently
- localStorage is synchronous but not atomic for read-modify-write

### Reflection
- **What went well:** Root cause found quickly via network tab
- **What could improve:** Should have added concurrency tests earlier

---
*Time spent: ~2 hours | Complexity: Medium*
```

### Example: Feature Wrap-up

```markdown
## ✅ Wrap-up

### Summary
Implemented dark mode toggle with system preference detection and localStorage persistence.

### Changes Made
- `src/components/ThemeToggle.tsx` — New toggle component
- `src/providers/ThemeProvider.tsx` — Theme context with persistence
- `src/styles/globals.css` — CSS variables for dark theme
- `tailwind.config.ts` — Dark mode configuration

### Key Takeaway
> When implementing theme switching, always respect system preference as default, not hardcoded light mode.

### Learnings
- `prefers-color-scheme` media query can be watched for live changes
- Tailwind's `darkMode: 'class'` gives more control than media query mode
- Flash of unstyled content prevented by inline script in `<head>`

### Reflection
- **What went well:** Clean separation between theme logic and UI
- **What could improve:** Could have reused existing color system more

---
*Time spent: ~3 hours | Complexity: Medium*
```

---

## When to Use Each

| Scenario | Action |
|----------|--------|
| Start work on minimal issue | Upsert description with planning |
| Start work on detailed issue | Add `[Planning]` comment (preserve original desc) |
| Hit unexpected complexity | Add `[Discovery]` comment |
| External feedback received | Reply to comment (not new top-level) |
| Blocked by dependency | Add `[Blocker]` comment |
| Work complete | Add Wrap-up comment |
| Bug fix (Medium+) | Add Wrap-up + Post-mortem (see postmortem.md) |

## gh CLI Commands

```bash
# Add comment
gh issue comment <NUMBER> --body "..."

# Update description
gh issue edit <NUMBER> --body "..."

# Get current description
gh issue view <NUMBER> --json body --jq '.body'
```
