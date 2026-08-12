# Issue tracker

Issues for this repo live in **GitHub Issues** on `bennyty/KTTime`, via the `gh` CLI.

PRs-as-a-request-surface flag: **off**.

## Wayfinding operations

The map and its tickets are ordinary GitHub issues.

- **Map**: an issue labelled `wayfinder:map`.
- **Ticket**: an issue created as a *sub-issue* of the map, via the GraphQL `addSubIssue` mutation (`gh api graphql`). Each ticket carries exactly one `wayfinder:<type>` label — `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- **Blocking**: expressed with GitHub's native issue dependencies via the GraphQL `addBlockedBy` mutation. A ticket is unblocked once every issue it's blocked-by is closed — this renders directly in the GitHub UI's "Blocked by" panel.
- **Claiming**: `gh issue edit <n> --add-assignee @me` (or the relevant user) before work starts.
- **Frontier query**: open, unassigned sub-issues of the map with no open blockers. In practice: list the map's sub-issues (GraphQL `subIssues` connection, or `gh issue list --search "is:open no:assignee"` cross-checked against the map's children), then check each candidate's `blockedBy` list is all-closed.
- **Resolution**: post a comment with the answer (`gh issue comment`), then close the ticket (`gh issue close`), then edit the map body to append a line under Decisions so far.

### Useful commands

```bash
# create the map
gh issue create --title "<name>" --label "wayfinder:map" --body "..."

# create a ticket and link it as a sub-issue of the map
gh issue create --title "<name>" --label "wayfinder:<type>" --body "..."
gh api graphql -f query='mutation($issueId:ID!,$subIssueId:ID!){addSubIssue(input:{issueId:$issueId,subIssueId:$subIssueId}){issue{id}}}' -f issueId=<map node id> -f subIssueId=<ticket node id>

# wire a blocking edge (ticket B is blocked by ticket A)
gh api graphql -f query='mutation($issueId:ID!,$blockingId:ID!){addBlockedBy(input:{issueId:$issueId,blockingIssueId:$blockingId}){issue{id}}}' -f issueId=<B node id> -f blockingId=<A node id>

# claim a ticket
gh issue edit <n> --add-assignee @me

# resolve a ticket
gh issue comment <n> --body "<answer>"
gh issue close <n>
```

Issue node ids (for the GraphQL mutations) come from `gh issue view <n> --json id -q .id`.
