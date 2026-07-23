# Superpowers Exemplars

Design specs and implementation plans written by the authors of the Superpowers plugin, salvaged before the plugin was uninstalled in July 2026.

## Why keep these

They are the reference implementation of the `brainstorming` → `writing-plans` document format that this workspace uses. Both skills were copied out of that plugin and now live in `~/.claude/skills/`. These 25 documents are what their own authors produced with them, so they set the bar for what a spec or plan should look like.

- `specs/` (14) come from the `brainstorming` skill: problem framing, options considered, the decision and its reasoning.
- `plans/` (11) come from the `writing-plans` skill: file structure, bite-sized tasks each carrying its own test cycle, no placeholders.

## Worth reading first

- `specs/2026-06-10-strict-cost-sdd-design.md` — a full cost breakdown of running subagent-driven development (controller vs implementers vs reviewers, dollars per run, where the waste is). Directly relevant to the model-routing rules in `~/.claude/CLAUDE.md`.
- `specs/2026-06-10-positive-instruction-redesign-design.md` — on writing skill instructions that state what to do rather than what to avoid.
- `plans/2026-04-06-worktree-rototill.md` — paired with its spec, a good example of a plan that survived contact with implementation.

## Status

Reference only. Nothing here is loaded by any skill, and none of it describes this workspace. Delete freely if it stops earning the space.
