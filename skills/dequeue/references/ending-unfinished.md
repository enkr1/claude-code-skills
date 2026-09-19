# Ending unfinished

Session ending with Done-when not yet met → run `enqueue`'s CLOSE step, same filename so the queue position holds.

If you appended as you worked, CLOSE is small: rewrite **Next action** only (`~/.claude/scripts/hd.sh <slug> next --replace '<body>'` swaps the body and keeps Done when / Authority unless the body carries its own), re-run Preflight, hand over. Everything else is already current. If you did not append, you are now paying the full rebuild at the worst context price of the session, which is the cost the write-through design exists to avoid. Do not repeat it next time.

Partially done is the likeliest state a successor inherits. Say plainly in State what you finished, what you touched but did not finish, and what you never reached.
