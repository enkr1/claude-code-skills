# GitHub Project Field IDs - Discovery Guide

> **Note:** Field IDs are repo/project-specific. Use the discovery commands below to find IDs for any project. For your project, see `config.json` (copied from config.example.json).

---

## Current User

```bash
# Get authenticated GitHub username
gh api user --jq '.login'
```

---

## How to Find Project IDs

### 1. Find Project ID and Number

```bash
# List all projects for an org
gh project list --owner <ORG_NAME>

# List all projects for a user
gh project list --owner @me
```

### 2. Find Field IDs

```bash
# Get all fields and their IDs for a project
gh api graphql -f query='
query {
  organization(login: "<ORG_NAME>") {
    projectV2(number: <PROJECT_NUMBER>) {
      id
      fields(first: 20) {
        nodes {
          ... on ProjectV2Field {
            id
            name
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}'

# For user-owned projects, replace "organization" with "user"
```

### 3. Find Issue Type IDs

```bash
# Get issue types for a repo
gh api graphql -f query='
query {
  repository(owner: "<OWNER>", name: "<REPO>") {
    issueTypes(first: 10) {
      nodes {
        id
        name
      }
    }
  }
}'
```

---

## gh CLI Commands Reference

### Create Issue (Manual Steps)

```bash
# Step 1: Create issue (no --type flag!)
gh issue create --title "..." --body "..." --assignee @me --label "..."

# Step 2: Get node_id for GraphQL
gh api repos/<OWNER>/<REPO>/issues/<NUMBER> --jq '.node_id'

# Step 3: Set issue type via GraphQL
gh api graphql -f query='mutation { updateIssue(input: { id: "<NODE_ID>", issueTypeId: "<TYPE_ID>" }) { issue { issueType { name } } } }'

# Step 4: Add to project
gh project item-add <PROJECT_NUMBER> --owner <OWNER> --url https://github.com/<OWNER>/<REPO>/issues/<NUMBER>

# Step 5: Set project fields (get item ID from step 4)
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <STATUS_FIELD_ID> --single-select-option-id <STATUS_ID>
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <PRIORITY_FIELD_ID> --single-select-option-id <PRIORITY_ID>
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <DATE_FIELD_ID> --date <YYYY-MM-DD>
```

### Update Existing Issue

```bash
# Update labels/assignee
gh issue edit <NUMBER> --add-label "enhancement" --add-assignee @me

# Update project fields
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <FIELD_ID> --single-select-option-id <OPTION_ID>
```

### Get Project Item ID

```bash
# Get item ID for an issue already in the project
gh api graphql -f query='
query {
  organization(login: "<ORG_NAME>") {
    projectV2(number: <PROJECT_NUMBER>) {
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue {
              number
            }
          }
        }
      }
    }
  }
}' --jq '.data.organization.projectV2.items.nodes[] | select(.content.number == <NUMBER>) | .id'
```

---

## Labels Reference

| Label | Use Case |
|-------|----------|
| `enhancement` | Improvement to existing feature |
| `ui/ux` | UI bug or improvement |
| `refactor` | Code restructuring |
| `needs-backend` | Needs backend changes |
| `needs-research` | Needs investigation |
| `unclear` | Requirements unclear |
| `monitoring` | Needs monitoring |
| `user-feedback` | From user report |
| `duplicate` | Already exists |
