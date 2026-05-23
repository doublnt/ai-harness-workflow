# Contributing

AnyHarness v3 optimizes for a small user-facing surface and a strong internal
harness generation workflow.

Guidelines:

1. Keep the public interface simple: one main skill, AnyHarness.
2. Put advanced behavior in references and scripts, not in extra user commands.
3. Do not add mandatory CLI setup for normal users.
4. Do not bake in authoritative business domain packs. Domain rules should be
   discovered from the project and confirmed by the user.
5. Deterministic enforcement must read the project-generated harness profile.
