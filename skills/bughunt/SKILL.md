---
name: bughunt
description: Issue→dev orchestrator that drives one bug report end-to-end — start the issue, root-cause it, audit the whole bug class, fix, test, verify, E2E, and open the PR to the integration branch. Chains the github-issue, diagnose, github-pr and comprehensive-review skills; does NOT reimplement them. INVOCATION-ONLY — triggers ONLY on the literal "/bughunt <issue#>". Never auto-triggers on "fix this" / "debug this" (those stay with the diagnose skill). Never touches main.
---

# /bughunt — one bug, issue-number-in → PR-to-dev

An **orchestrator**, not new logic. It sequences skills you already trust and adds **two hard human checkpoints** at the only two irreversible boundaries. If a delegated skill is missing, degrade gracefully (do the step inline, note it) — never fail the whole run.

**Invocation:** `/bughunt <issue#>` only. Do NOT run this from a natural-language "fix/debug this" — that is the `diagnose` skill's job. If the user typed prose, don't invoke bughunt.

**Never touches `main`.** Ends at a PR to the integration branch (`dev`) + issue END. Shipping to prod is a separate, deliberate `/github-pr` release run on `dev` (that is where `Closes #` fires).

## Pipeline

```
/bughunt 993
  0. Preflight   — confirm repo + issue exist; read issue fully
  1. START       — delegate: github-issue start (Type=bug, In-Progress, dates, assignee, priority, effort)
  2. Diagnose    — delegate: diagnose / systematic-debugging → reproduce + root-cause
     ⛔ CHECKPOINT 1 (HARD) — present root cause; user confirms before any code changes
  3. Class audit — find siblings of the SAME root-cause pattern (default: changed file + obvious call sites)
  4. Finish      — delegate: github-pr (finish pipeline: simplify → review → tests → verify → E2E)
     ⛔ CHECKPOINT 2 (HARD) — present E2E before/after evidence; user confirms before PR
                    → commit → PR to dev → github-issue END
  5. Handoff     — report; state that release to prod is a separate /github-pr run on dev
```

## Phase detail

### 0. Preflight
- Resolve target repo (must run inside a dev repo; if ambiguous, ask). `gh issue view <N>` — abort if not found.
- Read title, body, comments, linked PRs. If the issue is a feature/task, **stop** — bughunt is for bugs; suggest `/github-issue` instead.

### 1. START (delegate → github-issue)
- Run its START workflow (`issue start <N> --type bug ...`). LLM-estimate priority/effort per that skill's rules (Urgent = prod-block only). Gate: its exit code 0.

### 2. Diagnose (delegate → diagnose / systematic-debugging)
- Reproduce first, then root-cause. Runtime evidence over code-reading (per the diagnose skill's own rule). State the hypothesis in its required form (symptom → cause → verification → expected-if-true/false).
- **⛔ CHECKPOINT 1:** surface the confirmed root cause in 3-5 lines. **Stop. Wait for the user to confirm** the diagnosis is right before writing any fix. A wrong root cause wastes the entire run — this gate is not skippable.

### 3. Class audit
- Search for the SAME broken pattern elsewhere (e.g. other owner-blind write paths, other stale-anchor reads). Default breadth = the changed file + its obvious siblings/call-sites.
- **Whole-repo sweep is opt-in** — if the class looks broad, say so and **ask** before fanning out (this is the scope-balloon risk). Fold confirmed siblings into the same fix.

### 4. Finish (delegate → github-pr, feature branch → dev)
- Hand the working tree to the github-pr finish pipeline as-is: simplify → review (comprehensive-review) → tests (Phase 3, writes/extends the regression tests for the fixed class) → verify (Phase 4, incl. 4d env statement) → E2E (Phase 5, HARD gate for bugfixes: reproduce-broken then confirm-fixed on a real build).
- **⛔ CHECKPOINT 2:** present the E2E before (broken) / after (fixed) evidence. **Stop. Wait for user confirm** before the PR is opened. Do not merge on plausibility.
- Then let github-pr commit → open the PR to `dev` (with `Closes #<N>`, armed-not-fired) → run github-issue END.

### 5. Handoff
- Report: root cause, siblings fixed (the class), tests added, PR link, issue state.
- State explicitly: **the issue is NOT closed yet** — it closes when a separate `/github-pr` release run carries `dev → main`. Do not hand-close it.

## Guardrails (hard)

- **Two checkpoints are non-skippable.** No `--yolo`. The value is autonomy *between* the gates, not through them.
- **Never touch `main`.** No release, no prod merge inside bughunt.
- **Never auto-trigger.** Literal `/bughunt <issue#>` only.
- **Reuse, don't reimplement.** If github-issue/diagnose/github-pr exist, delegate. Only inline a step when its skill is absent, and say so.
- **Class audit asks before going wide.** Changed-file scope is free; repo-wide sweep needs a yes.

## Delegation map

| Phase | Skill | Owns |
|-------|-------|------|
| 1, 4-end | `github-issue` | lifecycle envelope: START fields, END date, board state |
| 2 | `diagnose` / `systematic-debugging` | reproduce + root-cause loop |
| 4 | `github-pr` | code→PR gate: simplify/review/tests/verify/E2E/commit/PR |
| 4 | `comprehensive-review` | invoked by github-pr Phase 2 |

## What this deliberately does NOT do
- Ship to prod / merge to main (separate `/github-pr` release run).
- Close the issue (release does, so "closed" always means "in prod").
- Fully autonomous prod changes (the two checkpoints are the point).
