#!/usr/bin/env python3
"""Tag a merged release PR and publish its GitHub Release, for when no CI workflow does it.

Usage: release-tag.py [PR_NUMBER] [--dry-run]

Run from inside the app repo. With no PR number it takes the latest PR merged into the release branch.
Safe to re-run: a merge commit that already carries a v-tag is left alone.
"""
import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SKILL_DIR = Path(__file__).resolve().parent.parent


def run(*cmd: str) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"{' '.join(cmd[:3])} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def load_config() -> dict:
    for name in ("config.json", "config.example.json"):
        path = SKILL_DIR / name
        if path.exists():
            return json.loads(path.read_text())
    return {}


def release_notes(body: str, number: int) -> str:
    kept = []
    for line in (body or "").splitlines():
        if line.startswith("## ") and "gate" in line.lower():
            break
        if re.match(r"\s*(Closes|Fixes|Resolves|Refs)\s+#\d+", line) or "claude.ai/code" in line:
            continue
        kept.append(line)
    return "\n".join(kept).strip() + f"\n\nFull commit list and sign-off: #{number}.\n"


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry_run = "--dry-run" in sys.argv[1:]
    cfg = load_config()
    branch = cfg.get("release_branch", "main")
    tz = ZoneInfo(cfg.get("release", {}).get("tag_tz", "UTC"))

    merged = json.loads(run("gh", "pr", "list", "--base", branch, "--state", "merged", "--limit", "30", "--json", "number,mergedAt"))
    if not merged:
        sys.exit(f"no PR has been merged into {branch}")
    newest = max(merged, key=lambda p: p["mergedAt"])["number"]
    number = int(args[0]) if args else newest

    pr = json.loads(run("gh", "pr", "view", str(number), "--json", "number,title,body,state,baseRefName,mergedAt,mergeCommit"))
    if pr["state"] != "MERGED" or pr["baseRefName"] != branch:
        sys.exit(f"#{number} is not a PR merged into {branch}")
    sha = pr["mergeCommit"]["oid"]

    run("git", "fetch", "--tags", "--quiet", "origin")
    existing = [t for t in run("git", "tag", "--points-at", sha).split() if t.startswith("v")]
    if existing:
        print(f"#{number} is already tagged {existing[0]} ({sha[:8]}), nothing to do")
        return 0

    merged_at = datetime.fromisoformat(pr["mergedAt"].replace("Z", "+00:00")).astimezone(tz)
    base = "v" + merged_at.strftime("%Y.%m.%d")
    taken = set(run("git", "tag", "-l", base, f"{base}.*").split())
    tag, n = base, 2
    while tag in taken:
        tag, n = f"{base}.{n}", n + 1

    title = f"{tag} {pr['title']}"
    notes = release_notes(pr["body"], number)
    latest = number == newest

    if dry_run:
        preview = notes.splitlines()
        print(f"tag:    {tag}\ntarget: {sha}\nlatest: {latest}\ntitle:  {title}\nnotes:  {len(preview)} lines\n")
        print("\n".join(preview[:12]))
        return 0

    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
        f.write(notes)
    print(run("gh", "release", "create", tag, "--target", sha, "--title", title, "--notes-file", f.name, f"--latest={str(latest).lower()}"))

    run("git", "fetch", "--tags", "--quiet", "origin")
    if run("git", "rev-list", "-n1", tag) != sha:
        sys.exit(f"{tag} does not point at {sha}, check the release")
    print(f"{tag} -> {sha[:8]} (latest={latest})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
