---
name: council
description: Claude-only port of Karpathy's llm-council for big one-off decisions in any domain (life, tech, writing): independent stance seats, an anonymised critique and ranking round, then a chairman verdict with a disagreement ledger. INVOCATION-ONLY: triggers on "/council", "council this", "ask the council", "开个会". Never auto-trigger; a normal question gets a normal answer.
---

# Council

Karpathy's llm-council (`karpathy/llm-council`, `backend/council.py`) sends the raw question to four different models, has each rank the others' anonymised answers, then a chairman synthesises. Its value is model diversity, and it needs OpenRouter credit. Here every seat is Claude, so **diversity comes from stances, not models**: four seats on the raw question would return four copies of one opinion.

Cost is about 2N+1 calls (N seats, N critiques, the chairman). Say the seat count before dispatching.

## 1. Brief (chairman = this session)

Pull context once, here, so every seat argues from the same facts: search the workspace, repo and any connected mail or docs before asking the user anything. Write `council-<slug>.md` to the scratchpad:

- **Question** in one sentence, and the **options** (always include "neither / wait").
- **Constraints** and what the user has said they want, quoted.
- **Evidence**, each fact with its source path or link.
- **CANNOT ANSWER**: what the brief does not know and seats must not guess.
- **Files** seats may read, by absolute path. Nothing else is in scope.

**The brief carries no lean.** The chairman does not state or hint at its own view before the seats return; a chairman that has already decided turns the council into confirmation.

## 2. Seats (Stage 1)

Pick 3 to 5 stances from [`references/stances.md`](references/stances.md): at least one General, the rest from the domain, none that would agree on this question by construction. Dispatch one `council-seat` agent (`enkr-skills:council-seat` when installed as the plugin) per stance **in a single message** (parallel, uncorrelated). Prompt: the stance's full entry pasted verbatim, the brief path, the word cap. Give each a `name` so it can be continued.

**Outside-model seat (opt-in only, "with gemini" or similar)**: the one real model diversity available without OpenRouter, via any non-Claude CLI the user has (e.g. `gemini -p`). Write a second brief with every personal detail stripped (names, money, health, employer), show it to the user before sending, then pass it with the seat rules from `agents/council-seat.md`. Never send it the full brief.

## 3. Critique (Stage 2)

Continue each seat with `SendMessage`: the other seats' answers relabelled Response A, B, C in a shuffled order, stance headers removed, **its own answer left out** (Karpathy's version lets a model rank its own; same-model seats recognise themselves, so that only adds self-preference). Seats critique, may revise their call, and end with `FINAL RANKING:`.

Tally: average rank per answer across the seats that ranked it. Parse failures count as missing, not last.

## 4. Verdict

Karpathy's chairman writes "the council's collective wisdom". Do not: blending is exactly where a same-model council smooths over a real split. Output, in this order:

1. **Call**: one option, stated plainly, with the two or three reasons that carry it.
2. **Ledger**: every point where seats split, who said what (by stance), and how the chairman settled it, or "unsettled" with what would settle it.
3. **Ranking**: the tally, one line. Where the chairman overrules the top-ranked answer, say why.
4. **Change my mind**: the one fact that would flip the call, and how to get it.

**Unanimity is weak evidence here.** If every seat agrees, say so and name the shared assumption they all made; same-model agreement is one opinion counted N times.

Show the verdict in chat. It lands in a file only when the user says where; the brief stays in the scratchpad.

## Rules

- **The record beats the council.** If a repo file, ledger or prior decision already settled it, say so and stop: the council is arguing a closed question.
- **Health and money floors win.** An open health issue, or a worst case the user's buffer cannot absorb, outranks every upside argument.
- **The user is the last seat.** Show the verdict before acting on it; they can overrule any of it.
