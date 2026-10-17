# coder-stack

Claude Code skills and agents that set how a coding agent works: short, detailed replies, deliberate use of subagents, simple code, and proof that each change works.

## What's included

- **`/coder-mode`**: the entry point. It sets the working style and hands off to another skill when that skill's trigger fires.
- **Workflow skills**: `how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `reflect`, `figure-it-out`, `tdd`, `recall`, `teach`, `show-me-your-work`, `blast-radius`, and others.
- **Writing skills**: `unslop`, `technical-writing`, and `no-comments`.
- **23 `principle-*` skills**: one engineering principle each. `coder-mode` cites them when they shape a decision.
- **Two agents**: `coder-agent`, which runs coder-mode, and `comment-sicko`, which reviews code comments.

All of it lives under [`.claude/`](.claude/).

## Install

coder-stack installs per repository. From a clone of this repo, copy it into your project:

```bash
mkdir -p /path/to/your-repo/.claude
cp -R .claude/skills .claude/agents .claude/coder-stack /path/to/your-repo/.claude/
```

Then, in Claude Code inside that project:

1. Run `/setup-coder-stack` to choose a model per role. This writes `.claude/coder-stack-models.md`.
2. Run `/coder-mode` to start working in the style.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- [Bun](https://bun.sh), for the helper scripts in `.claude/skills/coder-mode/scripts`. The scripts install their own `node_modules/` on first run.

## Port notes

[`.claude/coder-stack/README.md`](.claude/coder-stack/README.md) lists what changed from upstream and what was left out.

## Roadmap

Plugin packages for Claude Code, Codex, and Cursor are planned. Until they ship, install by copying `.claude/` as described above.
