# Post-Mortem Report Template

**When to use:** After fixing any Medium+ severity bug, add this as a comment to the GitHub issue.

---

## Template

```markdown
# Post-Mortem Report: {{TITLE}}

**Issue:** #{{ISSUE_NUMBER}}
**Date:** {{DATE}}
**Severity:** {{Low | Medium | High | Critical}}

---

## TL;DR
<!-- 3 sentences max. Busy readers stop here. -->

{{What happened}} → {{Why it happened}} → {{How we fixed it}}.

**Impact:** {{Who was affected and how}}

---

## What Happened

### The User Experience

1. **{{Persona}} does {{action}}** — {{expected behavior}}
2. **{{What went wrong}}** — {{unexpected result}}
3. **Result:** {{The bad outcome}}

---

## Why This Happened

### In Plain Language

{{Simple metaphor explaining the bug. Example: "Think of it as two workers not talking to each other..."}}

### Root Causes

| Cause | Description |
|-------|-------------|
| {{Cause 1}} | {{Why this caused the bug}} |
| {{Cause 2}} | {{Why this caused the bug}} |

---

## Risk Analysis
<!-- Include for Medium+ severity bugs only -->

| Risk | Likelihood | Impact |
|------|------------|--------|
| {{Risk 1}} | {{High/Medium/Low}} | {{Description}} |

### Why {{Severity}}, Not {{Higher/Lower}}?

- {{Reason for this severity level}}
- {{What would make it higher/lower}}

---

## The Fix

### In Plain Language

{{Explain the fix so a non-engineer understands}}

### Technical Changes

| File | Change |
|------|--------|
| `{{path/to/file.ts}}` | {{What was changed}} |

---

## Action Items

| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | {{Preventive action}} | @{{username}} | {{Sprint/Date}} | TODO |

---

## Key Takeaway

> "When [context], always [action], not [anti-pattern]."

---

*Fix: `{{commit_hash}}`*
```

---

## Section Requirements

| Section | Required | When |
|---------|----------|------|
| TL;DR | Yes | Always |
| What Happened | Yes | Always |
| Why This Happened | Yes | Always |
| Risk Analysis | Medium+ only | Skip for Low severity |
| The Fix | Yes | Always |
| Action Items | Yes | Always |
| Key Takeaway | Yes | Always |

## Key Takeaway Formula

> "When [context], always [action], not [anti-pattern]."

**Examples:**
- "When building parallel systems, always design coordination alongside features, not as an afterthought."
- "When validating input, always check at the boundary, not deep in the call stack."
- "When handling async state, always consider race conditions, not just the happy path."
