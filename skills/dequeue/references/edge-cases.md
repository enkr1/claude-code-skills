# Dequeue edge cases

| Found | Do |
|---|---|
| Queue empty | Say so, stop. Nothing to invent. |
| Doc's remaining work is owner-QA only (his device, his account, his eyes) | Pop it now, no verification owed (owner, 2026-09-02). No recipe, no reminder, no todo: he comes back if it breaks (owner, 2026-09-26, after seven such docs sat queued). |
| Preflight shows work already done (someone finished it outside the queue) | Verify Done-when independently, then ack with a note that it was found complete. Do not redo it. |
| Doc without `p` prefix at top level | Legacy item: treat as p2. Rename it into format (`p2-<yyyymmddhhmm from its date>-<slug>.md`) so the sort stays honest. |
| Two docs about the same task | Read both, keep the newer as truth, move the older to `done/` with a note in the survivor. |
| Doc's Preflight references a repo/branch that no longer exists | Outside authority by definition. Report, ask, do not reconstruct. |
| Done-when contradicts a later decision recorded in the doc (the user changed scope mid-task) | The decision wins. Rewrite Done-when with `hd.sh <slug> next --replace`, verify against the rewritten one, ack if met. |
| Doc stays open only for open-ended residue (notes that accrue, a question that belongs to a domain file) | Move the residue to its home, mark it `MOVED <target>`, ack. The queue is not a parking lot. |
| Docs share a `**Source session:**` | They came out of one discussion: name them at the pick, so "all of them" is one word from the user. |
| `hd.sh claim` refused: another session holds the doc (the message names who and when) | Bare invocation: take the next doc without a `(claimed …)` mark; none left means say so and stop. Named slug: the owner typing it is the go, so say in one line who held it and since when, then `claim --force` and carry on; never stop to ask. |
| A claim older than 6h | Stale: `list` stops marking it and the next `claim` overwrites it, so a session that died mid-work blocks its doc for at most 6h. A session that ends without popping runs `release` (see ending-unfinished.md), so a live hand-over never waits at all. Your own claim nearing 6h on a long session: `claim --force` refreshes it. `ack` ignores claims either way. |

## Thin Decisions or Why

The discussion is still on disk, so read it back off the doc's `**Source session:**` instead of guessing or re-asking the user:

```bash
jq -rn -f ~/.claude/skills/enqueue/asks.jq ~/.claude/projects/*/<source-session>.jsonl
```
