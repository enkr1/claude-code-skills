# Ending unfinished

The work is not on origin yet and the session is ending. The doc is already off the queue (pop moved it to `drafts/`), so close it there and hand over:

1. Rewrite **Next action** with `~/.claude/scripts/hd.sh <slug> next --replace '<body>'` (it keeps Done when and Authority unless the body carries its own), and say in State what you finished, what you touched but did not finish, and what you never reached. If you appended as you worked this is small; if you did not, you are paying the full rebuild at the worst context price of the session.
2. Tell the user in one line that it waits in `drafts/` and expires after 72h idle. It goes back in the queue only when they say enq (`hd.sh promote <slug> '<their words>'`), never on your initiative.
3. Print the resume command on its own line: `/pop <slug>`.

A doc that needs only the user's look, their word or a promotion is not unfinished: the work landed, so ack it (SKILL.md, "Landed is done").
