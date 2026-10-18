# coder-stack port notes

Ships as the `coder-stack` Claude Code plugin, with skills in `skills/` and agents in `agents/`. Entry point is `/coder-stack:coder-mode`.

## What changed from upstream

| Upstream (Cursor) | Here (Claude Code) |
|---|---|
| upstream mode skill and agent, `Comment Sicko` | `/coder-mode`, `coder-agent`, `comment-sicko` |
| `Task` tool, `generalPurpose`, `AskQuestion` | `Agent` tool, `general-purpose`, `AskUserQuestion` |
| `readonly: true` subagents | `general-purpose` with a no-edit prompt |
| cloud agents (`environment: "cloud"`) | background agents with `isolation: "worktree"` |
| Cursor models rule in `~/.cursor/rules/` + reasoning budget | `.claude/coder-stack-models.md`, no budget (effort follows the session) |
| models: opus / gpt-sol / grok | `opus` / `fable` / `sonnet` |
| `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.claude/projects/<slug>/<session-id>.jsonl` |
| `cursor-team-kit` `deslop`, `control-ui`, `control-cli` | built-in `/simplify`, browser tools, `/run` |
| Cursor built-in `create-skill` | `skill-creator` when installed |
| Cursor `/loop` | Claude Code `/loop` |

Also changed:

- `coder-mode` Autonomy defers to this repo's `CLAUDE.md`.
- Shipping warns off `gh pr merge --auto`.

## Not ported

- `make-bot-ui` is dropped. It drives Cursor Automations webhooks.
- `automations/benny` is dropped. It is a Cursor Automations pack.
- `docs/guide` is dropped. It is a Cursor walkthrough.
- The multi-vendor review panels are Claude-only now. `arena`, `interrogate`, and `architect` compare Claude models against each other.

## Scripts

- `skills/coder-mode/scripts` needs `bun`. It installs its own `node_modules/` on first run, which is gitignored.
