# issue-bot

Two cloud scheduled tasks that work one Slack issue channel. Triage reads each new report and posts one verdict in its thread. Repro reproduces confirmed bugs through the app's real UI, verifies existing fixes, and may open a small draft pull request.

The files here are a dormant pack. They aren't plugin skills and don't appear in the slash menu. Run `/coder-stack:setup-issue-bot` in the repository that should run the tasks. It copies this pack to `<repo>/.claude/automations/issue-bot/` and walks through the rest. The human walkthrough is [docs/automations.md](https://github.com/shishirmehto/coder-stack/blob/main/docs/automations.md) in the coder-stack repository.

## What each task does

### Triage: `issue-bot-triage`

- **Trigger:** each new top-level report in the source channel. A relay fires the task's API trigger with the report's coordinates, an hourly schedule sweeps for reports the relay missed, or both.
- **Behavior:** reads the thread and attachments. Classifies the report as a bug, a performance issue, a feature request, a question or feedback, or a reroute. Traces the likely owning code before routing.
- **Tracker:** searches the tracker connector for duplicates, updates a confident duplicate, and creates a ticket only for a clear new bug.
- **Outcome:** exactly one reply in the source thread with a short verdict and one marker, `[issue-bot:bug]`, `[issue-bot:performance]`, or `[issue-bot:other]`. A bug or performance marker may carry the tracker URL.
- **Boundary:** never a root message in the source channel.

Operational file: [`triage-issue-reports.md`](triage-issue-reports.md).

### Repro and fix: `issue-bot-reproduce`

- **Trigger:** the same relay fire, after which the run waits for the triage marker, or an hourly sweep that picks up one triaged report nobody has claimed.
- **Gates:** stops when a person owns the fix. Switches to verification when an existing pull request or merged commit may fix the report.
- **Behavior:** drives the app through the project's control skill and feature map, reproduces the exact symptom twice, and captures a screenshot, a recording, and a read-only state cross-check.
- **Fix:** after a confirmed repro, may try one bounded root-cause fix, test-first when the test is cheap, smoke the blast radius, and open a draft pull request only when before-and-after proof passes.
- **Outcome:** status reactions on the report, evidence in the operations thread or the run transcript, one concise source reply on a confirmed repro, and an optional draft pull request.
- **Boundary:** never a root message in the source channel. Never merges, marks ready, or deploys.

Operational file: [`reproduce-and-fix-issues.md`](reproduce-and-fix-issues.md).

## Shared rules

- The source channel ID and each report's root thread timestamp stay fixed for the whole run.
- Utility and debug bots in a thread are evidence, not fix owners.
- Subagents may help, but only as `issue-bot-reader` or `issue-bot-editor`. Their `tools` lists carry no MCP tools, so they can't reach Slack or the tracker. The **how** and **why** skills are the exception: their `general-purpose` explorers inherit every connector. The hook blocks every Slack call from them except reads. Only their briefs forbid tracker writes.
- A committed PreToolUse hook runs on every Slack tool: [`hooks/guard-slack-thread.mjs`](hooks/guard-slack-thread.mjs). In the source channel it allows only thread replies, for posts and file shares alike. From a subagent it allows only Slack reads. It denies the call when it can't check it, and `onFailure: "block"` makes a crash or timeout deny too.
- Both tasks fail closed when channel coordinates, tracker access, the control skill, or the feature map are missing or uncertain.
- Draft pull requests only.

## Why it lives in the repository

A cloud run starts from a fresh clone. It loads the repository's `CLAUDE.md`, `.claude/skills/`, `.claude/agents/`, and the hooks and permission rules in `.claude/settings.json`. It doesn't install plugins, including ones the repository enables, and it doesn't read your `~/.claude/settings.json`. So setup commits everything a run needs into the target repository.

That holds only for a task created outside any Claude project. A scheduled task in a project runs as a project thread, which loads the repository's `CLAUDE.md` but not its skills, agents, hooks, or permission rules. The run would lose the Slack guard, the workers, and the copied skills, so create both tasks outside any project.

| Path in the target repository | What it holds |
|---|---|
| `.claude/automations/issue-bot/` | This pack, copied whole |
| `.claude/agents/issue-bot-reader.md`, `issue-bot-editor.md` | The two workers, copied from [`agents/`](agents/) |
| `.claude/skills/<name>/` | Copies of the coder-stack skills the operational files use |
| `.claude/skills/verify-<app>/` | The control skill and feature map, from `/create-verification-skill` |
| `.claude/issue-bot/` | Your configuration, routing map, and any feature map, outside the pack so a refresh never overwrites them |
| `.claude/settings.json` | The Slack guard hook and the merge checkpoint, from [`templates/settings.example.json`](templates/settings.example.json) |
| `CLAUDE.md` | The run boundaries, from [`templates/claude-md.example.md`](templates/claude-md.example.md). Auto mode's classifier reads `CLAUDE.md` too |

## Layout

- [`triage-issue-reports.md`](triage-issue-reports.md), [`reproduce-and-fix-issues.md`](reproduce-and-fix-issues.md): the operational files each task prompt tells the run to follow
- [`references/`](references/): the control-skill contract, the feature-map shape, existing-fix verification, and a routing-map example
- [`templates/`](templates/): the configuration example, both task prompts, the settings and `CLAUDE.md` snippets
- [`hooks/`](hooks/): the Slack guard and its tests (`node --test automations/issue-bot/hooks/guard-slack-thread.test.mjs`)
- [`agents/`](agents/): the reader and editor workers
