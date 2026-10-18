# coder-stack

A Claude Code plugin of skills and agents that set how a coding agent works: short, detailed replies, deliberate use of subagents, simple code, and proof that each change works.

## What's included

- **`/coder-stack:coder-mode`**: the entry point. It sets the working style and hands off to another skill when that skill's trigger fires.
- **Workflow skills**: `how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `reflect`, `figure-it-out`, `tdd`, `recall`, `teach`, `show-me-your-work`, `blast-radius`, and others.
- **Writing skills**: `unslop`, `technical-writing`, and `no-comments`.
- **23 `principle-*` skills**: one engineering principle each. `coder-mode` cites them when they shape a decision.
- **Two agents**: `coder-stack:coder-agent`, which runs coder-mode, and `coder-stack:comment-sicko`, which reviews code comments.

Skills live in [`skills/`](skills/), agents in [`agents/`](agents/), and the plugin manifest in [`.claude-plugin/`](.claude-plugin/).

## Install

In Claude Code:

```
/plugin marketplace add shishirmehto/coder-stack
/plugin install coder-stack@coder-stack
```

Or from a shell:

```bash
claude plugin install coder-stack --marketplace shishirmehto/coder-stack
```

Restart Claude Code, then:

1. Run `/coder-stack:setup-coder-stack` in a project to choose a model per role. This writes `.claude/coder-stack-models.md` in that project.
2. Run `/coder-stack:coder-mode` to start working in the style.

Plugin skills are namespaced, so every skill is `/coder-stack:<name>` and every agent is `coder-stack:<name>`. The short form, such as `/coder-mode`, also works when no other installed skill has that name.

## Updates

The plugin has no `version` field, so each commit on `main` is a new version. To update by hand:

```bash
claude plugin update coder-stack@coder-stack
```

To update on startup instead, open `/plugin`, go to **Marketplaces**, select `coder-stack`, and choose **Enable auto-update**. Third-party marketplaces have auto-update off by default.

## Develop

Install from your clone instead of GitHub. A local directory marketplace loads in place, so your edits apply to every project without a push:

```bash
claude plugin marketplace add ~/git/coder-stack
```

```bash
claude plugin install coder-stack@coder-stack
```

Edits take effect at the next session start, or run `/reload-plugins` in a running session. Both marketplaces are named `coder-stack`, so add either your clone or the GitHub repo, not both.

To try a branch for one session without installing it:

```bash
claude --plugin-dir ~/git/coder-stack
```

Before you push, check the manifests and run the script tests:

```bash
claude plugin validate .
```

```bash
cd skills/coder-mode/scripts && bun test orch watch-pr
```

`claude plugin validate --strict` fails on the missing `version`. That is expected, so leave out `--strict`.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- [Bun](https://bun.sh), for the helper scripts in `skills/coder-mode/scripts`. The scripts install their own `node_modules/` on first run.

## Port notes

[`docs/port-notes.md`](docs/port-notes.md) lists what changed from upstream and what was left out.

## Roadmap

Plugin packages for Codex and Cursor are planned. They can point at the same `skills/` and `agents/` folders.
