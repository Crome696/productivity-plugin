# Repository Instructions

- Keep the installable Marketplace package entirely inside `plugin/`.
- Keep development-only files such as package metadata, tests, TypeScript
  configuration, and coverage output at the repository root.
- Keep the three root Marketplace descriptors synchronized and make each one
  resolve its local plugin source to `./plugin`.
- Keep the four plugin manifests synchronized on identity, version, author,
  repository, license, category, descriptions, tags, and local assets.
- Keep durable repository artifacts in English. Conversation guidance may use
  the user's language when the communication workflow requires it.
- Run `npm run typecheck`, `npm test`, and `npm run check` before delivery.
- Preserve the existing MIT license.
