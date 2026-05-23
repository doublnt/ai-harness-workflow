# AGENTS.md

AnyHarness v3 is a skill-first plugin project.

Agent instructions:

- Treat the main AnyHarness skill as the public interface.
- Use references for domain discovery, harness synthesis, expert review, and gate runtime behavior.
- Do not assume a project's domain from generic examples. Produce hypotheses with evidence, ask focused questions, and generate a project-specific harness profile.
- Keep repository writes safe: draft first when native prompt files already exist.
- Optional runtime scripts may scan, write profiles, generate review packets, and install local hooks only after user confirmation.
