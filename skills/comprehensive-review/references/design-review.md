# Design Review (Pre-Implementation)

Use this format when reviewing an approach, architecture, or requirements **before** coding begins.

## Required Output Format

Every design review MUST include these sections in order:

### 1. TL;DR
One sentence: what's being asked + your recommendation.

```markdown
## TL;DR
[Requirement summary] → [Recommended approach] because [key reason].
```

### 2. Requirement
State what's actually being asked. Make all assumptions explicit.

```markdown
## Requirement
**Goal:** [What success looks like]
**Constraints:** [Time, tech, dependencies]
**Assumptions:**
- [Assumption 1]
- [Assumption 2]
```

### 3. Clarifying Questions
Max 8 highest-value questions. If these aren't answered, the implementation will fail.

```markdown
## Clarifying Questions
1. [Question about scope/edge cases]
2. [Question about constraints]
3. [Question about expected behavior]
```

### 4. Approaches
Three options with trade-offs:

```markdown
## Approaches

### Option 1: Fastest (Ship Today)
**Implementation:** [Brief description]
**Pros:** Fast, minimal changes
**Cons:** [Technical debt, limitations]
**Risks:** [What could go wrong]

### Option 2: Robust (Production-Grade)
**Implementation:** [Brief description]
**Pros:** Proper error handling, tested
**Cons:** Takes longer
**Risks:** [What could go wrong]

### Option 3: Long-term (Future-Proof)
**Implementation:** [Brief description]
**Pros:** Scalable, maintainable
**Cons:** Highest effort
**Risks:** [What could go wrong]

**Recommendation:** Option [X] because [reason].
```

### 5. Risks & Failure Modes
What could go wrong and how to mitigate.

```markdown
## Risks & Failure Modes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High/Med/Low | [Impact] | [How to prevent] |
| [Risk 2] | High/Med/Low | [Impact] | [How to prevent] |
```

### 6. Test Plan
How to verify the implementation works.

```markdown
## Test Plan

### Unit Tests
- [ ] [What to test]

### Integration Tests
- [ ] [What to test]

### Manual Testing
- [ ] [Scenario to verify]

### Rollout Strategy
- [ ] Feature flag / gradual rollout
- [ ] Monitoring in place
- [ ] Rollback procedure documented
```

### 7. Next Actions
Concrete checklist with acceptance criteria.

```markdown
## Next Actions

- [ ] [Action 1] — AC: [How to verify done]
- [ ] [Action 2] — AC: [How to verify done]
- [ ] [Action 3] — AC: [How to verify done]
```

---

## Non-Negotiables

Every design review must address:

- [ ] **Input validation** — how is user input sanitized?
- [ ] **Auth/authz** — who can access this? How verified?
- [ ] **Performance** — impact on P50 TTI ≤ 2.5s, API success ≥ 99.5%?
- [ ] **Observability** — logging, metrics, error tracking in place?
- [ ] **Tests required** — what must be tested before merge?
- [ ] **Security** — threat model if touching user data/auth?

---

## Iteration

Continue iterating until:
- All clarifying questions answered
- Approach selected
- Next actions agreed

To proceed: "I'll go with option [X]. Please provide implementation steps."
