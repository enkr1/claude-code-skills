# Cut the release tag by hand (`release.tag: manual`)

Run right after the release PR merges, so the Releases page stays a complete history of what reached the release branch even when no CI workflow tags it.

1. **Merge SHA, full 40 chars.** `--target` rejects a short SHA with "Release.target_commitish is invalid".
   ```bash
   SHA=$(gh pr view <N> --json mergeCommit --jq .mergeCommit.oid)
   ```
2. **Tag name** `v<YYYY.MM.DD>`, dated in `release.tag_tz`, with `.2`, `.3` for a second or third release that day.
   ```bash
   BASE=v$(TZ=<tag_tz> date +%Y.%m.%d); TAG=$BASE; n=2
   while git ls-remote --exit-code --tags origin "$TAG" >/dev/null; do TAG=$BASE.$n; n=$((n+1)); done
   ```
3. **Notes:** the release PR body's summary, what's-new and verification sections (stop before any regression-gate checklist), then one closing line pointing back to the PR for the full commit list. Drop `Closes`/`Refs` lines and any session links.
4. **Create**, titled with the tag plus the release PR title:
   ```bash
   gh release create "$TAG" --target "$SHA" --latest --title "$TAG <release PR title>" --notes-file notes.md
   ```
5. **Verify:** after `git fetch --tags`, `git rev-list -n1 "$TAG"` equals `$SHA`, and `gh release list --limit 1` shows it as Latest.

Undo: `gh release delete "$TAG" --cleanup-tag --yes`.

A release merged outside a session gets no tag until someone runs this, so "tag the release" after a hand merge.
