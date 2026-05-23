# Security Policy

AnyHarness hooks run local commands. Review hook definitions before trusting them in Claude Code or Codex.

## Supported Versions

| Version | Supported |
|---|---|
| 2.x | yes |
| 0.x | unsupported |

## Reporting Vulnerabilities

Open a private advisory or email the maintainers. Do not include secrets in reports.

## Security Principles

- Hooks must not exfiltrate data.
- Hooks must not contact external networks.
- Hooks must not read real `.env` files.
- Hooks must fail closed only for clearly documented gates.
- Enforcement can be configured as `advisory`, `enforcing`, or `strict`.
