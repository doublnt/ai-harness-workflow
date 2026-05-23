# Review Packet

A review packet lets another model review code with enough context.

## Packet contents

```text
.anyharness/packets/<id>/
  PROMPT.md
  PROJECT_PROFILE.md
  DIFF.patch
  CHANGED_FILES.txt
  RELEVANT_FILES.md
  GATE_REQUIREMENTS.md
  DOMAIN_INVARIANTS.md
  UNKNOWN.md
```

## Prompt rules

The packet prompt must instruct the reviewing model to:

1. perform exactly one expert role unless asked otherwise
2. avoid implementing code
3. cite evidence from packet files
4. output Blockers / Needs Changes / Pass
5. list Unknowns that prevent Pass
