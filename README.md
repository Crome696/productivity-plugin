# Productivity Plugin

`productivity-plugin` is a CromeSDK Marketplace package whose installable
source is the local [`plugin/`](plugin/) directory. Version `0.1.0` provides
one focused capability: adaptive communication for technical, business, and
mixed audiences.

## Supported hosts

The repository contains synchronized Marketplace descriptors for Agents and
GitHub Copilot, Cursor, and Claude. The package also contains portable,
Cursor, Codex, and Claude plugin manifests. Host-specific hook projections are
declared only for Codex and Cursor.

Install the plugin from a local Marketplace descriptor using the source path
`./plugin`. Development files at the repository root are not part of the
installable package.

## Communication workflow

Use `/communicate` or the `adapt-communication` Skill to create new content or
rewrite supplied content. The workflow supports:

- `create` for composing an artifact from supplied facts, purpose, and
  constraints;
- `rewrite` for adapting supplied content while preserving its facts,
  identifiers, constraints, meaning, and intended scope;
- `technical`, `business`, and `mixed` audience profiles;
- contextual professional, precise, outcome-oriented, and layered tones.

An explicit audience or tone is respected when it is compatible with factual
accuracy and the English-artifact invariant. An audience is inferred only when
the request is unambiguous. Material ambiguity or missing facts produces a
clarification result instead of invented content.

Conversation-level explanations may follow the user's language. Every artifact
intended for persistence is English and is returned separately from the
localized explanation. Code, URLs, identifiers, product names, and other
immutable values are preserved when translating or rewriting them.

The workflow does not save, send, publish, or otherwise persist generated
content. Its version 1 handoff is the
[`CommunicationArtifact`](plugin/shared/schemas/CommunicationArtifact.yaml)
contract.

## Package architecture

The public flow is deliberately thin at the host boundary:

```text
/communicate
  -> communication-agent
  -> communication-policy + adapt-communication
  -> CommunicationArtifact v1
```

The Command delegates. The Agent owns orchestration and output framing. The
Rule contains durable policy. The Skill contains the communication behavior.
The schema describes the stable handoff. The structure hook validates the
package without editing it or classifying natural language.

## Local development

Development requires Node.js 20 or newer. From the repository root run:

```text
npm ci
npm run typecheck
npm test
npm run check
```

`npm run check` includes the deterministic structure validator. The validator
checks the plugin only when it recognizes the expected Productivity repository
identity, so unrelated repositories and unrelated shell commands remain
outside its scope.

## Extension points

Future Productivity capabilities should add independent Skills and their
own documented host projections without changing the communication contract
or broadening the current package into task management, calendar, email,
provider integrations, publication, or other excluded workflows.
