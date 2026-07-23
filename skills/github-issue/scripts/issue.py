#!/usr/bin/env python3
"""
GitHub Issue Workflow Tool (org-native fields + Project board)

Interactive commands that guide through the full issue lifecycle.
"""

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Optional


# Load config from adjacent config.json
CONFIG_PATH = Path(__file__).parent.parent / "config.json"
with open(CONFIG_PATH) as f:
    CONFIG = json.load(f)

OWNER = CONFIG["owner"]
REPO = CONFIG["repo"]
PROJECT_NUMBER = CONFIG["project_number"]
PROJECT_ID = CONFIG["project_id"]
FIELDS = CONFIG["fields"]
TYPES = CONFIG["types"]
BOT_MARKER = CONFIG.get("bot_marker", "")


def run_gh(args: list[str], capture: bool = True) -> str:
    """Run gh CLI command and return output."""
    cmd = ["gh"] + args
    if capture:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"gh command failed: {result.stderr}")
        return result.stdout.strip()
    else:
        result = subprocess.run(cmd)
        if result.returncode != 0:
            raise RuntimeError("gh command failed")
        return ""


def run_graphql(query: str, jq_filter: Optional[str] = None) -> str:
    """Run GraphQL query via gh api."""
    args = ["api", "graphql", "-f", f"query={query}"]
    if jq_filter:
        args.extend(["--jq", jq_filter])
    return run_gh(args)


def get_issue_node_id(number: int) -> str:
    """Get the GraphQL node ID for an issue."""
    return run_gh(["api", f"repos/{OWNER}/{REPO}/issues/{number}", "--jq", ".node_id"])


def get_project_item_id(number: int) -> Optional[str]:
    """Get the project item ID for an issue by querying the issue directly.

    Previous approach scanned `items(first: 100)` on the project, which broke
    when the project had >100 items. This approach queries the issue's own
    `projectItems` — O(1) regardless of project size.
    """
    query = f"""
    query {{
      repository(owner: "{OWNER}", name: "{REPO}") {{
        issue(number: {number}) {{
          projectItems(first: 10) {{
            nodes {{
              id
              project {{ number }}
            }}
          }}
        }}
      }}
    }}
    """
    jq = f".data.repository.issue.projectItems.nodes[] | select(.project.number == {PROJECT_NUMBER}) | .id"
    try:
        result = run_graphql(query, jq)
        return result if result else None
    except RuntimeError:
        return None


def get_issue_fields(number: int) -> dict:
    """Fetch all fields for an issue."""
    # Basic issue info
    issue_raw = run_gh(["api", f"repos/{OWNER}/{REPO}/issues/{number}"])
    issue_data = json.loads(issue_raw)

    assignees = [a["login"] for a in issue_data.get("assignees", [])]
    labels = [l["name"] for l in issue_data.get("labels", [])]
    state = issue_data.get("state", "")
    title = issue_data.get("title", "")

    # Issue type via GraphQL
    type_query = f"""
    query {{
      repository(owner: "{OWNER}", name: "{REPO}") {{
        issue(number: {number}) {{
          issueType {{ name }}
        }}
      }}
    }}
    """
    try:
        type_result = run_graphql(type_query, ".data.repository.issue.issueType.name // empty")
    except RuntimeError:
        type_result = ""

    # Project fields — query issue directly instead of scanning project items
    project_query = f"""
    query {{
      repository(owner: "{OWNER}", name: "{REPO}") {{
        issue(number: {number}) {{
          projectItems(first: 10) {{
            nodes {{
              project {{ number }}
              fieldValues(first: 20) {{
                nodes {{
                  ... on ProjectV2ItemFieldSingleSelectValue {{
                    name
                    field {{ ... on ProjectV2SingleSelectField {{ name }} }}
                  }}
                  ... on ProjectV2ItemFieldDateValue {{
                    date
                    field {{ ... on ProjectV2Field {{ name }} }}
                  }}
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """
    project_jq = f".data.repository.issue.projectItems.nodes[] | select(.project.number == {PROJECT_NUMBER}) | .fieldValues.nodes"
    try:
        project_raw = run_graphql(project_query, project_jq)
        project_fields = json.loads(project_raw) if project_raw else []
    except (RuntimeError, json.JSONDecodeError):
        project_fields = []

    # Parse project fields
    status = ""
    priority = ""
    start_date = ""
    end_date = ""

    for field in project_fields:
        field_name = field.get("field", {}).get("name", "")
        if field_name == "Status":
            status = field.get("name", "")
        elif field_name == "Priority":
            priority = field.get("name", "")
        elif field_name == "Start Date":
            start_date = field.get("date", "")
        elif field_name == "End Date":
            end_date = field.get("date", "")

    return {
        "title": title,
        "state": state,
        "assignees": assignees,
        "labels": labels,
        "type": type_result,
        "status": status,
        "priority": priority,
        "start_date": start_date,
        "end_date": end_date
    }


def set_issue_type(node_id: str, issue_type: str) -> None:
    """Set issue type via GraphQL mutation."""
    type_id = TYPES.get(issue_type)
    if not type_id:
        raise ValueError(f"Invalid type: {issue_type}. Valid: {', '.join(TYPES.keys())}")

    mutation = f"""
    mutation {{
      updateIssue(input: {{ id: "{node_id}", issueTypeId: "{type_id}" }}) {{
        issue {{ issueType {{ name }} }}
      }}
    }}
    """
    run_graphql(mutation)


def set_native_priority(node_id: str, priority: str) -> None:
    """Set GitHub's native issue Priority field (preview) to mirror the project
    priority, so new issues carry priority on the issue itself. p0/p1/p2 map to
    Urgent/High/Medium. Best-effort: the native-fields API is still preview, so a
    failure is swallowed with a note rather than breaking issue creation."""
    native = FIELDS.get("native_priority")
    if not native:
        return
    option_id = native["options"].get(priority)
    if not option_id:
        return
    mutation = f"""
    mutation {{
      setIssueFieldValue(input: {{
        issueId: "{node_id}",
        issueFields: [{{ fieldId: "{native['field_id']}", singleSelectOptionId: "{option_id}" }}]
      }}) {{ issue {{ number }} }}
    }}
    """
    try:
        run_graphql(mutation)
    except Exception as e:
        print(f"  (native Priority skipped, preview API: {e})")


def set_native_effort(node_id: str, effort: str) -> None:
    """Set GitHub's native issue Effort field (High/Medium/Low). LLM-estimated
    during triage, never asked of the reporter. Best-effort, same as priority."""
    field = FIELDS.get("effort")
    if not field:
        return
    option_id = field["options"].get(effort.lower())
    if not option_id:
        return
    mutation = f"""
    mutation {{
      setIssueFieldValue(input: {{
        issueId: "{node_id}",
        issueFields: [{{ fieldId: "{field['field_id']}", singleSelectOptionId: "{option_id}" }}]
      }}) {{ issue {{ number }} }}
    }}
    """
    try:
        run_graphql(mutation)
    except Exception as e:
        print(f"  (native Effort skipped: {e})")


def set_native_date(node_id: str, field_key: str, date_value: str) -> None:
    """Set a GitHub native issue Date field (Start date / Target date). Dual-write
    alongside the board date during native migration. Best-effort, same as priority."""
    field = FIELDS.get(field_key)
    if not field:
        return
    mutation = f"""
    mutation {{
      setIssueFieldValue(input: {{
        issueId: "{node_id}",
        issueFields: [{{ fieldId: "{field['field_id']}", dateValue: "{date_value}" }}]
      }}) {{ issue {{ number }} }}
    }}
    """
    try:
        run_graphql(mutation)
    except Exception as e:
        print(f"  (native date {field_key} skipped: {e})")


def set_project_field(item_id: str, field_id: str, option_id: str) -> None:
    """Set a single-select project field."""
    run_gh([
        "project", "item-edit",
        "--project-id", PROJECT_ID,
        "--id", item_id,
        "--field-id", field_id,
        "--single-select-option-id", option_id
    ])


def set_project_date_field(item_id: str, field_id: str, date_value: str) -> None:
    """Set a date project field."""
    run_gh([
        "project", "item-edit",
        "--project-id", PROJECT_ID,
        "--id", item_id,
        "--field-id", field_id,
        "--date", date_value
    ])


def add_to_project(issue_url: str) -> str:
    """Add issue to project and return item ID."""
    output = run_gh([
        "project", "item-add", str(PROJECT_NUMBER),
        "--owner", OWNER,
        "--url", issue_url
    ])
    # Try to extract item ID from output
    import re
    match = re.search(r'PVTI_[a-zA-Z0-9]+', output)
    return match.group(0) if match else ""


def prompt(message: str, options: Optional[list[str]] = None, default: Optional[str] = None) -> str:
    """Interactive prompt with optional validation."""
    if options:
        opts_str = "/".join(options)
        if default:
            full_msg = f"{message} [{opts_str}] ({default}): "
        else:
            full_msg = f"{message} [{opts_str}]: "
    elif default:
        full_msg = f"{message} ({default}): "
    else:
        full_msg = f"{message}: "

    while True:
        value = input(full_msg).strip()
        if not value and default:
            return default
        if not value:
            print("  Value required.")
            continue
        if options and value not in options:
            print(f"  Invalid. Choose from: {', '.join(options)}")
            continue
        return value


def display_field(name: str, value: str, required: bool = True) -> bool:
    """Display a field with status icon. Returns True if set."""
    if value:
        print(f"  {name:12} | \u2705 {value}")
        return True
    elif required:
        print(f"  {name:12} | \u274c MISSING")
        return False
    else:
        print(f"  {name:12} | \u23f8\ufe0f  (not required)")
        return True


def cmd_status(args: argparse.Namespace) -> int:
    """Show current field status for an issue."""
    number = args.number

    print(f"\nFetching issue #{number}...")
    fields = get_issue_fields(number)

    print(f"\nIssue #{number}: {fields['title'][:50]}...")
    print("\u2501" * 50)

    display_field("Assignee", ", ".join(fields["assignees"]))
    display_field("Labels", ", ".join(fields["labels"]))
    display_field("Type", fields["type"])
    display_field("Priority", fields["priority"])
    display_field("Status", fields["status"])
    display_field("Start Date", fields["start_date"])
    display_field("End Date", fields["end_date"], required=False)

    print("\u2501" * 50)
    return 0


def cmd_start(args: argparse.Namespace) -> int:
    """Interactive START workflow - fetch, prompt for missing, set all, verify."""
    number = args.number

    print(f"\n\U0001F4CD START CHECKPOINT - Issue #{number}")
    print("\u2501" * 50)

    # Fetch current state
    print("Fetching current state...")
    fields = get_issue_fields(number)

    print(f"\nIssue: {fields['title'][:60]}...")
    print("\u2501" * 50)
    print("CURRENT STATE:")

    all_set = True
    all_set &= display_field("Assignee", ", ".join(fields["assignees"]))
    all_set &= display_field("Labels", ", ".join(fields["labels"]))
    all_set &= display_field("Type", fields["type"])
    all_set &= display_field("Priority", fields["priority"])
    all_set &= display_field("Status", fields["status"])
    all_set &= display_field("Start Date", fields["start_date"])

    print("\u2501" * 50)

    want_effort = bool(getattr(args, "effort", None))
    # cc-local must be present to count as "fully set" \u2014 otherwise an
    # already-labelled issue (Labels shows as set) early-exits before the
    # cc-local guarantee below ever runs. This is the #892 gap: same class as
    # #926, just on the all-fields-set fast path instead of the label gate.
    cc_local_ok = getattr(args, "no_cc_local", False) or "cc-local" in fields["labels"]
    if all_set and not want_effort and cc_local_ok:
        print("\n\u2705 All START fields already set!")
        return 0

    if all_set and want_effort:
        print("\n\u2705 START fields already set; applying Effort only.")
    else:
        print("\nLet's fill in the missing fields:\n")

    # Collect missing values — use CLI flags if provided, otherwise prompt
    updates = {}

    # Type
    if not fields["type"]:
        if hasattr(args, 'type') and args.type:
            updates["type"] = args.type
            print(f"  Type: {args.type} (from --type flag)")
        else:
            issue_type = prompt("Type?", ["task", "bug", "feature"])
            updates["type"] = issue_type

    # Priority
    if not fields["priority"]:
        if hasattr(args, 'priority') and args.priority:
            updates["priority"] = args.priority
            print(f"  Priority: {args.priority} (from --priority flag)")
        else:
            priority = prompt("Priority?", ["p0", "p1", "p2"], "p1")
            updates["priority"] = priority

    # Effort (native field, LLM-estimated; optional — only applied when --effort passed)
    if hasattr(args, 'effort') and args.effort:
        updates["effort"] = args.effort
        print(f"  Effort: {args.effort} (from --effort flag)")

    # Labels: ALWAYS ensure cc-local (a CC session is opening this issue), and
    # merge --label / prompt with whatever is already on the issue. The old
    # "only when the issue has no labels" gate silently dropped BOTH cc-local
    # and --label on an already-labelled issue (e.g. an existing feature picked
    # up via start), which is exactly how #926 shipped without cc-local.
    desired = list(args.label) if getattr(args, "label", None) else []
    if not desired and not fields["labels"]:
        labels_input = input("Labels to add? (comma-separated, or skip): ").strip()
        if labels_input and labels_input.lower() != "skip":
            desired = [l.strip() for l in labels_input.split(",")]
    if not getattr(args, "no_cc_local", False) and "cc-local" not in desired:
        desired.append("cc-local")
    to_add = [l for l in desired if l not in set(fields["labels"])]
    if to_add:
        updates["labels"] = to_add
        print(f"  Labels to add: {', '.join(to_add)}")

    # Start always means In Progress — override any default/backlog state
    if fields["status"] != "In Progress":
        updates["status"] = "in-progress"
        print("  Status will be set to: In Progress")

    # Start date defaults to today
    if not fields["start_date"]:
        updates["start_date"] = date.today().isoformat()
        print(f"  Start Date will be set to: {updates['start_date']}")

    # Assignee defaults to @me
    if not fields["assignees"]:
        updates["assignee"] = "@me"
        print("  Assignee will be set to: @me")

    print("\n\u2501" * 50)
    print("Applying updates...")

    # Apply updates
    try:
        # Type (needs node_id)
        if "type" in updates:
            print(f"  Setting type to {updates['type']}...")
            node_id = get_issue_node_id(number)
            set_issue_type(node_id, updates["type"])

        # Labels (non-blocking: invalid label should not kill the whole workflow)
        if "labels" in updates:
            for label in updates["labels"]:
                try:
                    print(f"  Adding label: {label}...")
                    run_gh(["issue", "edit", str(number), "--add-label", label, "--repo", f"{OWNER}/{REPO}"])
                except RuntimeError as e:
                    print(f"  \u26a0\ufe0f  Label '{label}' failed ({e}). Skipping — add manually later.")

        # Assignee
        if "assignee" in updates:
            print(f"  Setting assignee to {updates['assignee']}...")
            run_gh(["issue", "edit", str(number), "--add-assignee", updates["assignee"], "--repo", f"{OWNER}/{REPO}"])

        # Project fields need item_id
        item_id = get_project_item_id(number)
        if not item_id:
            print("  Issue not in project, adding...")
            issue_url = f"https://github.com/{OWNER}/{REPO}/issues/{number}"
            returned_id = add_to_project(issue_url)
            if returned_id:
                item_id = returned_id
            else:
                # Fallback: wait and re-query (add_to_project didn't return ID)
                import time
                time.sleep(2)
                item_id = get_project_item_id(number)

        if not item_id:
            print("\n\u274c Could not get project item ID after adding to project.")
            print("  Try manually: gh project item-add ... then re-run this command.")
            return 1

        # Status
        if "status" in updates:
            print(f"  Setting status to {updates['status']}...")
            status_option = FIELDS["status"]["options"].get(updates["status"])
            if status_option:
                set_project_field(item_id, FIELDS["status"]["id"], status_option)

        # Priority
        if "priority" in updates:
            print(f"  Setting priority to {updates['priority']}...")
            priority_option = FIELDS["priority"]["options"].get(updates["priority"])
            if priority_option:
                set_project_field(item_id, FIELDS["priority"]["id"], priority_option)
                set_native_priority(get_issue_node_id(number), updates["priority"])

        # Effort (native field only — no board equivalent)
        if "effort" in updates:
            print(f"  Setting effort to {updates['effort']}...")
            set_native_effort(get_issue_node_id(number), updates["effort"])

        # Start date
        if "start_date" in updates:
            print(f"  Setting start date to {updates['start_date']}...")
            set_project_date_field(item_id, FIELDS["start_date"]["id"], updates["start_date"])
            set_native_date(get_issue_node_id(number), "native_start_date", updates["start_date"])  # dual-write native

    except Exception as e:
        print(f"\n\u274c Error applying updates: {e}")
        return 1

    # Verify
    print("\n\u2501" * 50)
    print("VERIFICATION:")

    fields = get_issue_fields(number)
    all_set = True
    all_set &= display_field("Assignee", ", ".join(fields["assignees"]))
    all_set &= display_field("Labels", ", ".join(fields["labels"]))
    all_set &= display_field("Type", fields["type"])
    all_set &= display_field("Priority", fields["priority"])
    all_set &= display_field("Status", fields["status"])
    all_set &= display_field("Start Date", fields["start_date"])

    print("\u2501" * 50)

    if all_set:
        print("\n\u2705 START checkpoint complete! Proceed to implementation.")
        return 0
    else:
        print("\n\u274c Some fields still missing. Please fix manually.")
        return 1


def cmd_end(args: argparse.Namespace) -> int:
    """END workflow - set end date, verify all fields, show close command."""
    number = args.number

    print(f"\n\U0001F3C1 END CHECKPOINT - Issue #{number}")
    print("\u2501" * 50)

    # Fetch current state
    print("Fetching current state...")
    fields = get_issue_fields(number)

    print(f"\nIssue: {fields['title'][:60]}...")
    print("\u2501" * 50)
    print("CURRENT STATE:")

    all_set = True
    all_set &= display_field("Assignee", ", ".join(fields["assignees"]))
    all_set &= display_field("Labels", ", ".join(fields["labels"]))
    all_set &= display_field("Type", fields["type"])
    all_set &= display_field("Priority", fields["priority"])
    all_set &= display_field("Status", fields["status"])
    all_set &= display_field("Start Date", fields["start_date"])
    end_set = display_field("End Date", fields["end_date"])
    all_set &= end_set

    print("\u2501" * 50)

    # Set end date if missing
    if not end_set:
        print("\nSetting End Date to today...")
        try:
            item_id = get_project_item_id(number)
            if not item_id:
                print("\u274c Could not get project item ID.")
                return 1

            today = date.today().isoformat()
            set_project_date_field(item_id, FIELDS["end_date"]["id"], today)
            set_native_date(get_issue_node_id(number), "native_target_date", today)  # dual-write native (no native actual-end; Target date mirrors board End)
            print(f"  \u2705 End Date set to {today}")

            # Re-verify
            fields = get_issue_fields(number)
            all_set = True
            all_set &= bool(fields["assignees"])
            all_set &= bool(fields["labels"])
            all_set &= bool(fields["type"])
            all_set &= bool(fields["priority"])
            all_set &= bool(fields["status"])
            all_set &= bool(fields["start_date"])
            all_set &= bool(fields["end_date"])

        except Exception as e:
            print(f"\u274c Error setting end date: {e}")
            return 1

    print("\u2501" * 50)

    if all_set:
        print("\n\u2705 END checkpoint complete!")
        print("\nTo close the issue, run:")
        print(f"  gh issue close {number} --repo {OWNER}/{REPO} --comment \"Fixed in <COMMIT_SHA>. <SUMMARY>\"")
        return 0
    else:
        print("\n\u274c Some START fields missing. Run `issue.py start` first.")
        return 1


def cmd_create(args: argparse.Namespace) -> int:
    """Create a new issue with all fields set."""
    if not args.title:
        print("Error: --title is required")
        return 1
    if not args.body:
        print("Error: --body is required")
        return 1
    if not args.type:
        print("Error: --type is required")
        return 1
    if args.type not in TYPES:
        print(f"Error: Invalid type '{args.type}'. Valid: {', '.join(TYPES.keys())}")
        return 1

    print("Creating issue...")

    # Stamp automation issues with an invisible trust marker (renders to nothing in
    # markdown). If the repo runs an "issue template gate" workflow, point that gate
    # at this same marker so scripted issues skip the human web-form template while
    # every human-filed issue is still held to it. Set `bot_marker` in config.json to
    # whatever string the gate greps for; leave it unset to stamp nothing.
    body = args.body
    if BOT_MARKER and BOT_MARKER not in body:
        body = f"{body}\n\n{BOT_MARKER}"

    # Step 1: Create issue
    create_args = [
        "issue", "create",
        "--title", args.title,
        "--body", body,
        "--assignee", "@me",
        "--repo", f"{OWNER}/{REPO}"
    ]
    labels = list(args.label or [])
    # Optionally auto-add default labels from config (e.g. a triage tag). Config-free repos add none.
    # Convention from a70958a; the create path never enforced it, so default it here.
    if not args.no_cc_local and "cc-local" not in labels:
        labels.append("cc-local")
    for label in labels:
        create_args.extend(["--label", label])

    issue_url = run_gh(create_args)
    number = int(issue_url.rstrip("/").split("/")[-1])
    print(f"Created issue #{number}")

    # Step 2: Set type
    print(f"Setting type to {args.type}...")
    node_id = get_issue_node_id(number)
    set_issue_type(node_id, args.type)

    # Step 3: Add to project
    print("Adding to project...")
    add_to_project(issue_url)

    import time
    time.sleep(1)

    item_id = get_project_item_id(number)
    if not item_id:
        print("Warning: Could not get project item ID")
        return 0

    # Step 4: Set project fields.
    # Most creates are work-starts-now, so default = In Progress + today's start date.
    # Pass --backlog for the minority filed to do later (documentation / user-feedback /
    # research / tech-debt) — those land in Backlog with no start date.
    if args.backlog:
        print("Setting status to Backlog (--backlog: no start date)...")
        set_project_field(item_id, FIELDS["status"]["id"], FIELDS["status"]["options"]["backlog"])
    else:
        print("Setting status to In Progress...")
        set_project_field(item_id, FIELDS["status"]["id"], FIELDS["status"]["options"]["in-progress"])
        print("Setting start date to today...")
        today_iso = date.today().isoformat()
        set_project_date_field(item_id, FIELDS["start_date"]["id"], today_iso)
        set_native_date(node_id, "native_start_date", today_iso)  # dual-write native

    if args.priority:
        if args.priority not in FIELDS["priority"]["options"]:
            print(f"Warning: Invalid priority '{args.priority}'")
        else:
            print(f"Setting priority to {args.priority}...")
            set_project_field(item_id, FIELDS["priority"]["id"], FIELDS["priority"]["options"][args.priority])
            set_native_priority(node_id, args.priority)

    if getattr(args, 'effort', None):
        print(f"Setting effort to {args.effort}...")
        set_native_effort(node_id, args.effort)

    print(f"\n\u2705 Done! Issue #{number} created and configured.")
    print(f"URL: {issue_url}")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="GitHub Issue Workflow Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  start <number>   Interactive START workflow - fills missing fields
  end <number>     END workflow - sets end date, shows close command
  create           Create new issue with all fields
  status <number>  Show current field status

Examples:
  issue.py start 42       # Start working on issue #42
  issue.py end 42         # Finish issue #42
  issue.py status 42      # Check fields on issue #42
  issue.py create --title "Fix bug" --body "Description" --type bug
"""
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # start command
    start_parser = subparsers.add_parser("start", help="Interactive START workflow")
    start_parser.add_argument("number", type=int, help="Issue number")
    start_parser.add_argument("--type", choices=["task", "bug", "feature"], help="Pre-set type (skip prompt)")
    start_parser.add_argument("--priority", choices=["p0", "p1", "p2"], help="Pre-set priority (skip prompt)")
    start_parser.add_argument("--effort", choices=["high", "medium", "low"], help="Native Effort field (LLM-estimated; optional)")
    start_parser.add_argument("--label", action="append", help="Pre-set labels (skip prompt, repeatable)")
    start_parser.add_argument("--no-cc-local", action="store_true", help="Do not auto-add the cc-local label (default: added on start, since a CC session is opening it)")

    # end command
    end_parser = subparsers.add_parser("end", help="END workflow")
    end_parser.add_argument("number", type=int, help="Issue number")

    # status command
    status_parser = subparsers.add_parser("status", help="Show field status")
    status_parser.add_argument("number", type=int, help="Issue number")

    # create command
    create_parser = subparsers.add_parser("create", help="Create new issue")
    create_parser.add_argument("--title", required=True, help="Issue title")
    create_parser.add_argument("--body", required=True, help="Issue body")
    create_parser.add_argument("--type", required=True, choices=["task", "bug", "feature"], help="Issue type")
    create_parser.add_argument("--priority", choices=["p0", "p1", "p2"], help="Priority")
    create_parser.add_argument("--effort", choices=["high", "medium", "low"], help="Native Effort field (LLM-estimated; optional)")
    create_parser.add_argument("--label", action="append", help="Labels (repeatable)")
    create_parser.add_argument("--backlog", action="store_true", help="File to do later: Backlog, no start date (default: In Progress + today's start date)")
    create_parser.add_argument("--no-cc-local", action="store_true", help="Do not auto-add the cc-local label (default: added, since a CC session opens it)")

    args = parser.parse_args()

    commands = {
        "start": cmd_start,
        "end": cmd_end,
        "status": cmd_status,
        "create": cmd_create
    }

    try:
        return commands[args.command](args)
    except KeyboardInterrupt:
        print("\nAborted.")
        return 130
    except Exception as e:
        print(f"\nError: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
