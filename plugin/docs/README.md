# Productivity Plugin Documentation

## Installation boundary

Marketplace descriptors at the repository root point to the installable local
source `./plugin`. The package contains only host manifests, registered
components, documentation, and the logo. Node.js package metadata, tests,
TypeScript configuration, and other development tools remain outside the
package.

Supported host projections are Cursor, Codex, Claude, and Agents/GitHub
Copilot. Codex and Cursor declare the deterministic structure hook through
their native hook configuration files.

## Component ownership

The Command is intentionally thin. It forwards a communication request to
`communication-agent`. The Agent applies `communication-policy`, invokes
`adapt-communication`, and returns a version 1 `CommunicationArtifact`. The
Skill owns behavior; the Rule owns durable policy; the schema owns the stable
handoff shape.

## Create and rewrite

Create mode composes new content only from supplied facts, purpose, and
constraints. Rewrite mode adapts supplied content without silently broadening
or narrowing its meaning, scope, facts, constraints, identifiers, URLs, code,
or names.

Technical output preserves terminology and implementation detail. Business
output emphasizes outcomes, impact, decisions, risks, and next actions.
Mixed output begins with a concise business-oriented overview and follows
with the technical detail needed by implementers or reviewers.

## Language and clarification

Conversation-level questions and explanations may use the active conversation
language. Content intended for persistence is always English. The workflow
does not infer missing facts or present inferences as facts. It asks a focused
question when a missing fact or audience choice is material. A clarification
or blocked result never contains a fabricated completed artifact.

## Validation

The root development package runs `npm run typecheck`, `npm test`, and
`npm run check` on Node.js 20 or newer. The structure validator is read-only,
recognizes only safe commit invocations, and does not use heuristic language
classification.
