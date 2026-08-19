# Productivity Plugin

The `productivity` plugin is a small, host-compatible communication package.
Its installable boundary is this directory; development tooling lives in the
repository root.

## Identity

- Name: `productivity`
- Display name: `Productivity`
- Version: `0.1.0`
- Developer: `CromeSDK`
- License: `MIT`
- Repository: `https://github.com/Crome696/productivity-plugin`

## Public components

| Component | Responsibility |
| --- | --- |
| `adapt-communication` Skill | Creates or rewrites evidence-bound artifacts. |
| `/communicate` Command | Thin entry point that delegates to the Agent. |
| `communication-agent` Agent | Applies policy, invokes the Skill, and frames output. |
| `communication-policy` Rule | Keeps communication and artifact-language behavior durable. |
| `CommunicationArtifact` | Version 1 structured handoff for the resulting artifact. |
| Structure hook | Validates package structure before recognized commits. |

## Behavior

The workflow has `create` and `rewrite` modes and supports technical,
business, and mixed audiences. It never invents material facts. Explicit
audience and tone requests are respected when compatible with factual
accuracy. Ambiguous audience choices or missing material facts produce a
clarification or blocked result.

Conversation-level guidance may use the user's language. Persisted output is
always English, and `CommunicationArtifact.artifact_language` is always `en`.
The localized explanation is kept outside the separately delimited artifact.

The workflow is not a task manager, calendar, project manager, email client,
provider integration, publisher, or storage layer. It does not perform
external writes.

## Extension points

Independent future workflows should add their own Skill, supporting host
projection, documentation, tests, and versioned contract without expanding
the communication workflow's responsibilities.
