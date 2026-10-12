# Publishing the prototype as a Claude artifact

Published from the build session on 2026-10-12:
**https://claude.ai/artifact/FHH1MXbKeUE9ucHsgYNsce** (private to Tim's account until shared from the page's Share menu).

How it was published (Claude Code `Artifact` tool):
- page: `prototype/src/index.html`; supporting files published alongside at the same relative paths:
  `prompts.js`, `engine.js`, `store.js`, `seed.js`, `member.js`, `organiser.js`, `network.js`.
- capabilities: `sample: {}` (the page asks Claude on the viewer's own account; consent on first call) and
  `db: {rules: [{path: "profiles", read: "admin", write: "admin"}]}` (only the owner and editors read or
  write the shared store; a write level can never sit below the read level, so "members write, organiser reads"
  is not expressible, see NOTES.md decision 2.3).
- verified after publish: the `profiles` collection is empty; a probe document written as the owner was invisible
  at contributor level and was deleted afterwards.

To republish after a change: publish the same file path again with the same `files` map and `url`.

Fallback without the artifact runtime: open `index.html` from a local static server (the test scripts show how).
Claude calls then need either the legacy in-chat `window.claude.complete` (paste the page into a chat) or a mock.
