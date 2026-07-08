---
name: github-pr
description: One PR skill for the whole feature→integration→release flow. Reads the current branch and auto-routes — a feature branch runs the finish pipeline (simplify→review→tests→verify→E2E→commit→PR→close issue) to the integration branch; the integration branch runs the release pipeline (changelog→commit→draft PR) to the release branch. Pairs with the github-issue skill. Triggers on "/github-pr", "submit to dev", "PR to dev", "release PR", "merge to main", "dev → main", or when done with a feature/fix.
---

# /github-pr — Auto-routing PR pipeline

One skill, two pipelines, selected by the branch you're on. No credentials: auth is your own `gh`.

## 0. Load config + route

```bash
# Config lives next to this skill (copy config.example.json → config.json).
CFG="$(dirname "$0")/config.json"   # or the skill dir; read every value with a default fallback
BRANCH=$(git branch --show-current)
```

Read `config.json` (fall back to `config.example.json` defaults for any missing key):
`app_dir` (default `.`), `integration_branch` (default `dev`), `release_branch` (default `main`),
`assignee`, `reviewer`, `verify.*` commands, `test_policy`, `i18n_locales`, `deploy.*`, `release.*`.

**Route by branch:**

| Current branch | Route | Pipeline |
|----------------|-------|----------|
| `release_branch` (e.g. `main`) | **ABORT** | "You're on the release branch. Nothing to PR from here." |
| `integration_branch` (e.g. `dev`) | **RELEASE** | integration → release (§B) |
| anything else (feature/fix) | **FEATURE** | feature → integration (§A) |

Announce the route: `github-pr: FEATURE mode (branch → dev)` or `github-pr: RELEASE mode (dev → main)`.

## Flag parsing (FEATURE mode)

- `--skip-simplify` / `--skip-review` / `--skip-tests` / `--skip-e2e` / `--skip-issue` — skip that phase. Combinable.
- `--draft` — open the PR as draft (RELEASE mode defaults to draft when `release.draft` is true).

---

# §A — FEATURE mode (feature branch → integration branch)

Pipeline: **simplify → review → tests → verify → E2E → commit → PR → close issue → watch deploy.** Hard gates between phases; each must pass before the next.

## Pre-flight (abort if any fail)

1. **On a feature branch.** Not `integration_branch`/`release_branch` (routing already guaranteed this).
2. **Rebase on latest integration.** `git fetch origin <integration>` → `git rebase origin/<integration>`. Conflicts → STOP, surface to user. Stale code = false confidence.
3. **Has changes.** `git status --short` + `git log <integration>..HEAD --oneline`. Nothing to submit → ABORT.
4. **Existing PR?** `gh pr list --head "$BRANCH" --base <integration> --json number,url`. If found → Phase 7 **updates** it, not create.
5. **Linked issue.** Extract first number from branch name; `gh issue view N` to verify. Valid → store for Phase 8; else Phase 8 auto-skips.
6. **Detect capabilities** (check once, enforce throughout). A check is auto-skipped with a note if the capability is absent:

   | Capability | Detect | Enforces |
   |------------|--------|----------|
   | i18n | `next-intl`/`i18next` in `package.json`, or a `messages/` locale dir | Phase 2 i18n audit + key parity |
   | Skeletons | `grep -rl "Skeleton" src/` finds `*Skeleton` | Phase 2 skeleton sync |
   | Unit tests | `vitest`/`jest` in `package.json` | Phase 3 write tests |
   | Lint | `eslint` in `package.json` or `.eslintrc*` | Phase 4 lint |
   | E2E/UI | changed `.tsx` with JSX | Phase 5 browser test |

Track a per-phase status (`done`/`skipped`/`failed`) for the final summary.

## Phase 1 — Simplify (`--skip-simplify`)
Invoke the `simplify` skill (if present): diff → parallel reuse/quality/efficiency review → fix valid issues. Re-run once if fixes applied (max 2 iterations). No `simplify` skill available → skip with note.

## Phase 2 — Review (`--skip-review`)
Invoke `comprehensive-review` (if present); it produces a Critical/Major/Minor report. Plus, when the capability was detected in pre-flight (NOT skippable when detected):

- **2a. i18n audit** — every changed `.tsx`: hardcoded user-facing string (JSX text, `placeholder`, `aria-label`, toast, error) not going through the i18n system → **Major**, must fix. When fixing, add the key to **all** `i18n_locales`.
- **2b. i18n key parity** — extract keys from each locale in `i18n_locales`, diff against the first (source of truth). Missing key → **Major**.
- **2c. skeleton sync** — changed component whose layout/structure changed AND has a `*Skeleton` → skeleton must be updated → **Major**.

Critical/Major (incl. i18n/skeleton) → fix, re-review (max 2). Minor-only → log in PR body, proceed. Pass = APPROVE, or NEEDS WORK with only Minor left.

## Phase 3 — Write tests (`--skip-tests`)
Every changed file with testable logic needs coverage. For each changed `.ts`/`.tsx` (excluding `.test.`/`.spec.`): find its test counterpart; create if missing, extend if the changed function/hook/component is uncovered. Read sibling tests first to match the project's patterns. Test **behavior** — happy path, edge cases (empty/null/boundary), error handling. **Mock shapes must match real API responses** (fake-passing tests are worse than none).

**⚠️ Running tests — respect `test_policy`:**
- `single-file-or-ci` (default): run **only the specific new/changed test file(s)** via `verify.test` with `{file}` substituted — **never** the whole suite locally (a large `vitest`/pool-workers suite melts RAM). If you can't isolate to a file, **defer to CI** and note it; don't run the full suite.
- `full`: the project's suite is safe to run locally — run `verify.test` without `{file}`.

Auto-skip when changes are purely config/docs/styles (no testable logic).

## Phase 4 — Verify (gate: all green)
Run in `app_dir`, in parallel where possible: `verify.typecheck`, `verify.lint`, `verify.build`, and (per `test_policy`) the single-file or CI-deferred test. Any fail → read error, fix, re-run failed check only (max 2 attempts, then STOP + surface).
- **4b. Security** — if `package.json`/lockfile changed: `npm audit --production`. Critical/High → **Major**, resolve or justify. Moderate/Low → note in PR body.
- **4c. Bundle delta** — if build output jumps >10%, note in PR body (informational, not a gate).

## Phase 5 — E2E browser test (`--skip-e2e`)
Auto-skip if no `.tsx` changed. **🚨 HARD GATE for bug-fix PRs (gitmoji 🐛 / label bug / branch `fix/*`): NOT skippable.** A bugfix must **reproduce the broken behavior, then confirm it gone on a real running build** before merge — green tsc/lint/build is not proof. Prefer the live deploy via Chrome MCP (reaches authed pages while the user's session is live; clear the service-worker + caches first so you test the fresh bundle), else have the user click through. State before (broken) and after (working) explicitly. Can't verify → STOP, don't merge on plausibility. (Born from a "fix" that shipped, merged, and deployed green without fixing the bug.)

Use the `tester` agent if available: new tab → navigate to affected pages → `read_page` renders → `read_console_messages` (no errors) → `read_network_requests` (no 4xx/5xx) → `gif_creator` evidence. Failures → fix, re-run (max 2).

## Phase 6 — Commit
Invoke the `commit` skill: gitmoji + conventional, single line, stage only relevant files, **no AI-signature trailer**. Nothing uncommitted → skip.

## Phase 7 — PR to integration
```bash
git push -u origin "$BRANCH"
```
Existing PR → `gh pr edit <N> --body ...`. Else create with **every required field** (this is what keeps PRs uniform):
```bash
gh pr create --base <integration_branch> --title "<gitmoji title>" \
  --assignee <assignee> [--reviewer <reviewer>] --label <type> --body "..."
```
**Title MUST start with a gitmoji** and stay under ~70 chars, derived from the branch commits. Body template:
```markdown
## Summary
- <what changed>

## Review
**Verdict:** <🔴 REJECT / 🟡 NEEDS WORK / 🟢 APPROVE> (or "Skipped")
<key findings>

## Test Coverage
- New tests: <count or "None needed"> · Files: <list>

## Verification
- [x] Type check · [x] Lint · [x] Build · [x] Tests (single-file/CI) · [x] E2E (or "Skipped — no UI")

## Minor Issues (deferred)
<list or "None">

Closes #<issue>
```

## Phase 8 — Issue lifecycle (`--skip-issue`)
Auto-skip if no linked issue. Else, **only when the user wants it merged** (this skill stops at an open PR by default if you're operating in review-gated mode — see the hard rules):
```bash
gh pr merge <N> --squash --delete-branch
<issue_helper> end <issue>          # sets end/target date, verifies fields (if issue_helper set)
gh issue close <issue> --comment "Shipped in PR #<N>. <pipeline table>"
git checkout <integration> && git pull && git branch -d "$BRANCH"
```

## Phase 9 — Watch deploy (non-blocking)
Only if the PR was merged AND `deploy.watch_cmd` is set AND `"integration"` ∈ `deploy.watch_on`. Run `deploy.watch_cmd` (with `{branch}`=integration) in the **background** so it self-notifies; print the summary immediately with `deploy: ⏳ watching`. Relay one line when it lands (`✅ <sha>` + URL) or surface the failing log URL immediately (a red integration deploy blocks the team). No `deploy.watch_cmd` → skip silently.

---

# §B — RELEASE mode (integration branch → release branch)

Cut a release PR from integration to release. Config `release.*` drives changelog handling, title, and draft.

## Pre-flight
```bash
git fetch origin <integration> <release>
git log <release>..<integration> --oneline        # commits to ship
git diff <release>..<integration> --stat | tail -1 # stats
```
Nothing ahead → ABORT ("release is up to date with integration").

## Step 1 — Changelog (per `release.changelog`)
- **`auto`** — CI generates release notes; **skip the manual changelog step entirely** (do NOT hand-write one). Proceed to Step 2.
- **`manual`** — append an entry to `release.changelog_path`, grouped by type (✨ Features / 🐛 Fixes / 🔒 Security / 🎨 Improvements / ⏪ Reverts / 📊 Stats), then commit + push it to integration:
  ```bash
  git add <changelog_path> && git commit -m "📝 docs(changelog): <summary>" && git push origin <integration>
  ```
- **`none`** — no changelog.

## Step 2 — Create the release PR
```bash
gh pr create --base <release_branch> --head <integration_branch> \
  --title "<release.title_prefix><Theme 1>, <Theme 2> & <Theme 3>" \
  --assignee <assignee> [--draft if release.draft] --body "..."
```
Body: summary · what's-new grouped by theme (with `#issue` refs) · stats table · collapsible full commit list grouped by type (`feat`/`fix`/`fix(security)`/`style`/`refactor`/`revert`/`docs`) with 7-char SHAs · test plan checkboxes. **No AI-signature trailer.**

## Step 3 — Verify completeness
Cross-check every commit is represented:
```bash
comm -23 <(git log <release>..<integration> --format="%h" | sort) \
         <(gh pr view <N> --json body --jq '.body' | grep -oE '[a-f0-9]{7}' | sort -u)
```
Any missing SHA → update the PR body.

## Step 4 — Draft + hand off
If `release.draft`: PR is draft (review gate). If `release.native_automerge` is false (default), **do NOT enable auto-merge** — leave it for manual review/merge. Optionally watch the release deploy (§A Phase 9 with `{branch}`=release, if `"release"` ∈ `deploy.watch_on`).

---

# Shared hard rules

- **Uniform PR fields, always:** gitmoji-first title, `--assignee`, `--label`, correct `--base`, `--reviewer` when configured. This is the whole point of one skill — every PR comes out identically shaped.
- **No AI-signature trailer** in any commit or PR body (no `Co-Authored-By`, no "Generated with Claude Code").
- **Never run the full test suite locally** unless `test_policy: full` — single file or defer to CI.
- **Stop at the open PR by default; the human is the merge gate.** Only merge/close (Phase 8 merge) when the user has said to, or the project's flow explicitly auto-merges feature PRs. Never merge a release PR.
- **Bug-fix PRs must be reproduced-then-verified on a running build** (Phase 5 hard gate), never shipped on source plausibility.
- **`git add <explicit paths>` only** — never `git add .`/`-a` (sweeps unrelated files).
- **Pre-flight hygiene** on PR title + body before creating: no em-dashes, no leaked team-member names / git-author names (use roles), only the configured `assignee` handle.

## On disk
- `skills/pr/SKILL.md` — this skill. `config.json` (gitignored) — your project values; copy from `config.example.json`.
- Composes `simplify`, `comprehensive-review`, `commit`, the `tester` agent, and (if configured) a `github-issue` helper. **Degrade rule:** a missing composed dep → skip that phase with a note, never hard-fail the pipeline.
