# Dequeue edge cases

| Found | Do |
|---|---|
| Queue empty | Say so, stop. Nothing to invent. |
| Doc's remaining work is owner-QA only (his device, his account, his eyes) | Pop it now, no verification owed (owner, 2026-09-02). Report the check recipe in one line; he files a new item if it breaks. |
| Preflight shows work already done (someone finished it outside the queue) | Verify Done-when independently, then ack with a note that it was found complete. Do not redo it. |
| Doc without `p` prefix at top level | Legacy item: treat as p2. Rename it into format (`p2-<yyyymmddhhmm from its date>-<slug>.md`) so the sort stays honest. |
| Two docs about the same task | Read both, keep the newer as truth, move the older to `done/` with a note in the survivor. |
| Doc's Preflight references a repo/branch that no longer exists | Outside authority by definition. Report, ask, do not reconstruct. |
| Done-when contradicts a later decision recorded in the doc (the user changed scope mid-task) | The decision wins. Rewrite Done-when with `hd.sh <slug> next --replace`, verify against the rewritten one, ack if met. |
| Doc stays open only for open-ended residue (notes that accrue, a question that belongs to a domain file) | Move the residue to its home, mark it `MOVED <target>`, ack. The queue is not a parking lot. |

## Thin Decisions or Why

The discussion is still on disk, so read it back off the doc's `**Source session:**` instead of guessing or re-asking the user:

```bash
jq -rn -f ~/.claude/skills/enqueue/asks.jq ~/.claude/projects/*/<source-session>.jsonl
```
