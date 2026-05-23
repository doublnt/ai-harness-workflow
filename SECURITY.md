# Security Policy

This project is a governance plugin. v1 avoids runtime execution by design.

Report security issues if a skill or manifest encourages any of the following:

- running destructive commands without confirmation
- reading `.env` or secret files by default
- weakening tests or security controls
- modifying authentication, authorization, migrations, CI/CD, production config, or secrets without human approval
- hiding unknowns or claiming tests passed without evidence

The intended default behavior is: read-only scan, explicit report, user confirmation, then scoped writes.
