# Output Contract

## initialize/adopt

```text
Project Scan Summary:
AI Workflow:
Stack Hypotheses:
Domain Hypotheses:
Evidence:
Unknowns:
Questions:
Proposed Harness:
Files Proposed:
Confirmation Needed:
```

**Success example**: All sections present; Questions contains 5–12 targeted items; Unknowns lists anything that couldn't be inferred.
**Failure / partial example**: If scan returned zero files, note it in Unknowns and ask the user to confirm the root path.

## review

```text
Summary:
Selected Expert Roles:
Scope:
Evidence:
Blockers:
Needs Changes:
Non-blocking Suggestions:
Unknowns:
Required Tests / Evidence:
Verdict:
```

**Success example**: Blockers section is empty or lists specific findings with file+line citations; Verdict is Pass or Blocked with reasoning.
**Failure example**: If diff is empty, report it as an error and ask the user to stage changes or provide a diff manually.

## review packet

```text
Packet created: .anyharness/packets/<id>/
Files: PROMPT.md PROJECT_PROFILE.md CHANGED_FILES.txt DIFF.patch GATE_REQUIREMENTS.md DOMAIN_INVARIANTS.md RELEVANT_FILES.md UNKNOWN.md
Next step: Give the packet directory to another model and ask it to perform one role only.
```

**Success example**: GATE_REQUIREMENTS.md and DOMAIN_INVARIANTS.md contain real project content from profile.json (not placeholder text).
**Failure example**: If diff is empty, exit with code 1 and explain how to stage changes.

## writes

```text
Files Created:
Files Drafted:
Files Not Modified:
Remaining Unknowns:
Next Steps:
```

**Success example**: Files Drafted lists `.anyharness/drafts/` paths when target files already existed; no existing file was silently overwritten.
**Failure example**: If `--confirm` is missing, report "drafted" and include the path to review the draft.
