# Cut the release tag by hand (`release.tag: manual`)

Right after the release PR merges, from inside the app repo:

```bash
python3 ~/.claude/skills/github-pr/scripts/release-tag.py            # latest PR merged into the release branch
python3 ~/.claude/skills/github-pr/scripts/release-tag.py <PR#>      # a specific one, e.g. a backfill
python3 ~/.claude/skills/github-pr/scripts/release-tag.py --dry-run  # print the plan, create nothing
```

It tags the merge commit `v<YYYY.MM.DD>`, dated by the merge time in `release.tag_tz` (`.2`, `.3` for later releases that day), and publishes a GitHub Release titled with the tag plus the PR title. Notes are the PR body up to the regression-gate heading, minus `Closes`/`Refs` lines and session links, plus a link back to the PR.

A merge commit that already has a tag is left alone, so re-running is safe. Only the newest release merge is marked Latest, so a backfill never takes it.

Undo: `gh release delete <tag> --cleanup-tag --yes`.
