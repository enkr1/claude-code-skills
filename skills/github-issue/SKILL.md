---
name: github-issue
description: GitHub issue lifecycle management for any GitHub project (org-native Type/Priority/Effort fields + a Project board). Triggers on "fix #X", "debug #X", "implement #X", "work on #X", "start #X", "close #X", "resolve #X", "investigate #X", "analyse #X", "understand #X", "review #X", or any issue reference. Handles 4-phase workflow (Understand -> Issue Fields START -> Execute -> Issue Fields END) with staff engineer mindset.
---

# GitHub Issue Workflow

> **IMPORTANT:** `gh issue create` does NOT have a `--type` flag! Always use the `issue.py` script which handles type setting via GraphQL.

## Quick Reference

```bash
# Shorthand (add to shell config if desired)
alias issue='python3 ~/.claude/skills/github-issue/scripts/issue.py'

# Commands
issue status $ISSUE    # Check current field status
issue start $ISSUE     # Interactive START workflow
issue end $ISSUE       # END workflow (set end-date, show close cmd)
issue create --title "..." --body "..." --type bug|task|feature [--priority p0|p1|p2] [--effort high|medium|low] [--label ...]

# Non-interactive start (RECOMMENDED for Claude Code — avoids stdin pipe issues)
issue start $ISSUE --type bug --priority p1 --effort medium --label ui/ux

# Any command can target another repo
issue status 76 --repo enkr1/form-check-app
```

> **IMPORTANT for Claude Code:** Always use `--type`, `--priority`, `--effort`, `--label` flags with `start`.
> NEVER pipe stdin (`echo "bug\np1" | issue start`). Pipe misalignment causes fields to be set incorrectly.

### Which repo am I filing into?

Resolved in this order, per command:

1. `--repo owner/name`
2. the cwd's git remote (`gh repo view`)
3. `config.json`

Config is picked to match: an adjacent **`config.<owner>.<repo>.json`** wins, else `config.json` when its own `owner`/`repo` match the target, else a degraded stub. Both config files are gitignored; symlink them out of a private directory the way `config.json` already is.

**Never assume the repo.** Running in the wrong directory files the issue in the wrong project. When it matters, pass `--repo` explicitly rather than trusting the cwd.

### Degraded mode (no board, no issue types)

Projects v2 boards and native issue Types are org-scoped. A personal or solo repo usually has neither, and the script adapts instead of failing:

| | Full config | Degraded |
|---|---|---|
| `create` | issue + type + board Status/dates + native fields | issue + labels + assignee |
| `start` | all of the above | assignee + labels, exit 0 |
| `end` | End Date, then the close command | the close command |
| Priority | native field + board field | a label, via `priority_labels` |

Degraded is a real completion, not a failure: `start` and `end` still exit 0 so the surrounding workflow is unchanged.

Two config keys carry the difference:

```jsonc
{
  "owner": "enkr1",
  "repo": "form-check-app",
  // Board-less stand-in for the Priority field.
  "priority_labels": { "p0": "priority:high", "p1": "priority:medium", "p2": "priority:low" },
  // Labels stamped on every scripted issue. MUST be [] where the repo has no
  // cc-local label: gh rejects the whole `issue create` on one unknown label.
  "auto_labels": []
}
```

`auto_labels` defaults to `["cc-local"]` when the key is absent, so existing configs keep their behaviour.

### Priority + Effort → GitHub NATIVE issue fields (SSOT)

Priority and Effort live on GitHub's **native, issue-type-scoped fields** (the board is kept only for Status + dates). `issue.py` writes them; the `--priority p0|p1|p2` flag maps to native `Urgent/High/Medium` for back-compat.

- **Priority — `Urgent` is production-block ONLY.** Reserve the top tier for "your production site is blocked/broken/losing-data/exposed for real users." A red *dev* deploy is not Urgent. Uncertain → not Urgent. Native tiers: **Urgent** (=`p0`) · **High** (=`p1`) · **Medium** (=`p2`) · **Low**. The bug template's **Environment (Prod/Dev)** field is the fact this call needs.
- **Effort is LLM-estimated at triage** (`--effort high|medium|low`), never asked of the reporter. Native fields are **type-scoped** — an issue with no Type shows no Priority/Effort fields, so always set the Type (`issue start` does).

### Label Schema (facets) — SSOT

Labels are namespaced facets: `<facet>-<value>`, flat, lowercase, hyphen-separated.
The facet is everything before the FIRST hyphen. Dimensions needing enforced
single-select (Type / Priority / Status / Effort) live on native fields + the board,
NEVER as labels.

| Facet | Question it answers | Values today |
|-------|---------------------|--------------|
| `cc-` | which Claude Code lane touched this? | `cc-local` (interactive session on this machine) / `cc-scheduled` (autonomous loop or cron pass) / `cc-recommend-close` (loop verdict: stale or duplicate, awaiting human close) / `cc-no-repro` (local repro attempt failed; loops skip re-picking) |
| `src-` | where did this issue come from? | `src-user-feedback` / `src-llm-output` (LLM-output-rooted; fix prompt or model, not FE) / `src-teams` (auto-filed from a Teams thread) / `src-meeting` (filed by meeting-triage) |
| `needs-` | what is this blocked on? | `needs-backend` / `needs-research` / `needs-triage` / `needs-design` (visual call routes through the design lead; scaffold + stop) |

Rules:
- A new value must answer its facet's question; a new facet = a new prefix + a row here.
- A label only exists if a skill or workflow WRITES or READS it. No speculative values.
- **Retire-on-touch:** legacy labels duplicating native fields (`bug`, `enhancement`,
  `refactor`, `performance`, `ui/ux`, `to optimise`, `done`, `reviewed`, `parked`) are
  not renamed; drop them from an issue as touched once the native field carries the signal.
- **Never touch:** `claude` (triggers claude.yml), `dependencies` / `github-actions`
  (Dependabot), GitHub defaults (`duplicate`, `wontfix`, `invalid`, `question`,
  `good first issue`, `help wanted`).
- Scope: frontend-owned repos (web-app, mobile, desktop). Other repos: propose to
  owners, never rename unilaterally.

---

## Phase 1: Understand (Staff Engineer Mode)

1. **Fetch issue** - `gh issue view <number>` + check project fields with `issue status`
2. **Read thoroughly** - Title, body, comments, linked PRs, attachments
3. **Trace context** - What feature/component? What's the expected behavior?
4. **Identify unknowns** - What's unclear? What assumptions am I making?
5. **Ask sharp questions** - If anything is ambiguous, ask BEFORE proceeding (max 2-3 targeted questions)

---

## Phase 2: Issue Fields (START)

### 2a. Update Description (If Needed)

**Decision Logic:**
- Minimal/placeholder description -> **Upsert** with planning
- User feedback only -> **Preserve original** + add planning section below
- Already has comprehensive plan -> **Skip** upsert

**Planning Template:** See [templates.md](references/templates.md)

### 2b. Run START Workflow

```bash
python3 ~/.claude/skills/github-issue/scripts/issue.py start $ISSUE
```

**What happens:**
1. Fetches current issue state and displays it
2. Shows which fields are missing
3. **Prompts interactively** for missing fields:
   - `Type? [task/bug/feature]:` - you must answer
   - `Priority? [p0/p1/p2]:` - you must answer (default: p1)
   - `Labels to add?` - comma-separated or "skip"
4. Auto-sets: Status -> In Progress, Start Date -> today, Assignee -> @me
5. Applies all updates
6. Verifies and shows final state

**GATE: Exit code MUST be 0 before proceeding to Phase 3.**

**If `start` fails:**
1. Read the error message — it tells you exactly what broke
2. **Fix the script or config** — do NOT bypass with manual `gh issue edit`
3. Re-run `start` until exit code 0
4. Manual workarounds leave fields incomplete and defeat the purpose of tracking

---

## Workflow Automations

| Trigger | Automatic Action |
|---------|-----------------|
| Issue closed | Status -> Testing (via GitHub Actions) |
| Status: Testing -> Done | Manual (after verification) |

**NEVER manually set Status to "Done"** - let the workflow handle transitions.

---

## Phase 3: Execute

Execute based on issue type:

| Type | Process |
|------|---------|
| **Bug** | Reproduce -> Trace -> Root Cause -> Fix -> Report |
| **Feature** | Plan -> Implement -> Test |
| **Task** | Execute as specified |

### Progress Comments

Add comments with phase tags when:

| Scenario | Action |
|----------|--------|
| Hit unexpected complexity | `[Discovery]` comment |
| Blocked by dependency | `[Blocker]` comment |
| Milestone reached | `[Progress]` comment |
| Need clarification | `[Question]` comment |

**Templates:** See [templates.md](references/templates.md)

### Bug Investigation Process

1. **Reproduce** - Confirm the bug with exact steps
2. **Trace** - Find the code path where the bug occurs
3. **Root Cause** - Identify WHY it happened (not just WHERE)
4. **Fix** - Implement the minimal fix
5. **Report** - If Medium+ severity, add post-mortem (see below)

### Post-Mortem (Medium+ Bugs Only)

**Required for P0/P1 bugs.** Add as issue comment before closing:
- What happened
- Root cause
- How it was fixed
- How to prevent similar issues

**Template:** See [postmortem.md](references/postmortem.md)

### Spawning Side Issues

When you discover a bug/task while working on another issue:

```bash
python3 ~/.claude/skills/github-issue/scripts/issue.py create \
  --title "[Type]: description" \
  --body "**Found while working on #<PARENT>**

## Context
[What you were doing when you found this]

## Problem
[Description of the side issue]" \
  --type task \
  --priority p2 \
  --label "<appropriate-label>"
```

**Decision:** P0 blocker -> switch immediately. P1/P2 -> note and continue.

---

## Phase 4: Issue Fields (END)

### 4a. Code Review (Before closing)

**Run `comprehensive-review` skill** on all changes:
- Triggers automatically or say "review my code"
- Must pass with APPROVE or NEEDS WORK (with fixes)
- REJECT = go back to Phase 3

### 4b. Wrap-up Comment

Add wrap-up comment with:
- **Summary** - What was done, outcome
- **Changes Made** - Files changed with brief description
- **Key Takeaway** - "When [context], always [action], not [anti-pattern]"
- **Learnings** - Technical insights discovered

**Template:** See [templates.md](references/templates.md)

### 4c. Run END Workflow

```bash
python3 ~/.claude/skills/github-issue/scripts/issue.py end $ISSUE
```

**What happens:**
1. Verifies all START fields are still set
2. Sets End Date -> today (if not already set)
3. Verifies everything
4. Shows the close command to run

**GATE: Exit code MUST be 0. Then run the close command shown:**

```bash
gh issue close $ISSUE --repo <owner>/<repo> --comment "Fixed in <COMMIT_SHA>. <SUMMARY>"
```

**If `end` fails:**
1. Same rule as `start` — fix the root cause, don't bypass
2. Do NOT close the issue manually with `gh issue close` until `end` succeeds
3. Closing without `end` = missing End Date = broken project metrics

---

## Key Behaviors

- **Think like staff engineer** - Question assumptions, validate understanding
- **Ask sharp questions** - "What should happen when X?", "Is Y the expected behavior?"
- **Don't assume** - If unclear, ask. Max 2-3 targeted questions.
- **Use the scripts** - They handle the field update complexity for you
- **Answer prompts** - The start command is interactive, respond to each prompt
- **Track thinking** - Upsert description for planning, add comments for progress
- **Reflect on completion** - Wrap-up comment captures learnings for future

---

## References

- **[scripts/issue.py](scripts/issue.py)** - Workflow commands (start, end, create, status)
- **[config.example.json](config.example.json)** - copy to `config.json` (gitignored) and fill your own IDs; see references/field-ids.md
- **[field-ids.md](references/field-ids.md)** - Discovery commands for other projects
- **[templates.md](references/templates.md)** - Description, comment, and wrap-up templates
- **[postmortem.md](references/postmortem.md)** - Post-mortem template for Medium+ bugs
