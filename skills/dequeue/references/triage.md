# Before you list: reconcile, then triage

## Reconcile

Work finishes outside `dequeue` and nothing acks the doc, so settle judgement-free Done-whens first: a sha, `buildId` or deployed version is one `git merge-base --is-ancestor` away. Ack those, list the rest. **Never a prose Done-when**, which has to be run: inferring one from a merge commit closes work never done, and did on 2026-09-10.

## Triage

**The cap is enforced HERE, not at enqueue.** Enqueue fires at end of session with context burnt, when nobody triages ninety items; popping is the fresh moment.

Cap 20, no `p3`. Over either, clear the overflow oldest first before working the head:

- Backlog, not interrupted work (no half-finished state, survives a month) -> GT task, `mv` to `done/`. Most of it.
- Knowledge, not a task (a spec, a decided vocabulary) -> `docs/feature-<name>.md`, `mv` to `done/`.
- In flight -> leave it, say why.

A handoff is for work resumed within days. The format is expensive on purpose, so backlog wearing it never gets ticked: 78 of 95 were p2/p3 on 2026-09-11.
