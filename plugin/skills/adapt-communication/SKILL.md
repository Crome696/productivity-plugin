---
name: adapt-communication
description: Create or rewrite evidence-bound English communication artifacts for technical, business, or mixed audiences while keeping localized guidance outside the persisted artifact.
---

# Adapt Communication

Create or rewrite one communication artifact without inventing facts or
silently changing the supplied scope.

## Inputs

Accept the user's request, the mode, supplied facts, purpose, constraints,
optional source content, optional audience, optional tone, and normalized
conversation language. The mode is `create` or `rewrite`. The audience is
`technical`, `business`, or `mixed`.

## Resolution

1. Preserve an explicit mode and audience.
2. Infer an omitted audience only when the request and context make it
   unambiguous.
3. Ask one focused question when competing audience profiles would materially
   change the artifact.
4. Resolve tone contextually: precise for technical readers,
   outcome-oriented for business readers, layered for mixed readers, and
   clear, concise, and professional by default.
5. Honor an explicit compatible tone request.
6. Identify missing material facts before drafting.

## Create mode

Compose new content only from supplied facts, purpose, and constraints. Do
not add commitments, dates, actors, metrics, requirements, risks, or
conclusions that were not supplied.

## Rewrite mode

Adapt the supplied content while preserving its meaning, facts, constraints,
identifiers, code, URLs, names, and intended scope. Do not silently broaden,
narrow, or reinterpret the source.

## Language boundary

Use the user's language for short conversational questions and explanations
when appropriate. Write the resulting artifact in English. Keep the
conversation-level explanation outside the separately delimited artifact.
There is no artifact-language override in version 1.

## Result

Return exactly one version 1 `CommunicationArtifact` handoff. A `ready` result
has a non-empty English title/body and no unresolved material questions. A
`needs_clarification` or `blocked` result has no fabricated completed
artifact, explains the missing information or failure, and keeps the
structured failure nullable when no operational failure occurred.

The Skill performs no file, messaging, provider, publication, or other
external write.
