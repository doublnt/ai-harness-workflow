# Security Policy

This project generates AI governance files but does not provide security guarantees.

## Reporting issues

Open a private security advisory or contact the maintainers if you find behavior that could cause:

- accidental secret exposure
- unsafe file overwrite
- dangerous default permissions
- generated instructions that bypass human approval for high-risk changes

## Security design

The CLI starts in read-only analysis mode and writes only after confirmation unless `--yes` is used. Generated permission files are conservative and should be reviewed before committing.
