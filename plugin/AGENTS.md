# Productivity Plugin Inventory

This directory is the installable package boundary. Keep all registered
components and their assets inside this tree.

## Registered components

- `skills/adapt-communication/SKILL.md` owns create and rewrite behavior.
- `commands/communicate.md` is the thin `/communicate` entry point.
- `agents/communication-agent.md` owns orchestration and output framing.
- `rules/communication-policy.mdc` is the global communication policy.
- `shared/schemas/CommunicationArtifact.yaml` defines the version 1 handoff.
- `hooks/codex-hooks.json` and `hooks/cursor-hooks.json` project the
  read-only structure validator to supported hosts.
- `hooks/pre-commit-structure.mjs` validates the package deterministically.

Keep the four plugin manifests synchronized on core identity and version.
Host-specific declarations may differ only when the host has a distinct
supported projection. Do not add development dependencies, tests, package
metadata, or generated state inside this package.
