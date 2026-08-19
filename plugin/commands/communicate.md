# `/communicate`

Create or rewrite a communication artifact for a technical, business, or
mixed audience.

This Command is a thin entry point. It must pass the user's request, selected
or unresolved mode, supplied source content, audience, tone, facts, purpose,
and constraints to `communication-agent`. It must not implement audience
selection, tone resolution, translation, clarification, or artifact
validation itself.

The Agent returns a short conversational explanation in the user's language,
followed by a separately delimited English artifact represented by the version
1 `CommunicationArtifact` contract.
