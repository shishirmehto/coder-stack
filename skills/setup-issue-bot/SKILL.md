---
name: setup-issue-bot
description: Install or reconfigure the issue-bot pack, two cloud scheduled tasks that triage Slack issue reports and reproduce confirmed bugs into draft pull requests. Use for /setup-issue-bot, "set up the issue bot", or changing its Slack, tracker, repository, routing, control, model, or budget settings.
disable-model-invocation: true
---

# Set up the issue bot

The pack lives at `${CLAUDE_SKILL_DIR}/../../automations/issue-bot/`, called `<pack>` below. Read `<pack>/README.md` first. It is the intent for both tasks and lists every path setup writes in the target repository. The human walkthrough is `${CLAUDE_SKILL_DIR}/../../docs/automations.md`.

The issue bot needs files committed in the target repository, two cloud scheduled tasks at [claude.ai/code/routines](https://claude.ai/code/routines), and, for real-time triage, a relay that fires them.

Rules for the whole flow:

- Don't create, edit, or enable a scheduled task yourself. The API trigger and its token exist only on the web, so the user does every step there. You draft the prompts and the checklist.
- Don't commit or push unless the user asks.
- Never put a secret value in the pack, a prompt, or committed configuration. Never ask for a token in chat.

## 1. Copy the pack, the workers, and the shared skills

Ask which repository will run the tasks. Every path below is relative to that repository's root.

Merge `<pack>` into `.claude/automations/issue-bot/`:

1. Create the destination when it is absent.
2. Copy every pack file to the same relative path.
3. Keep destination-only files. Never delete unrelated files on install or refresh.
4. When a pack-managed file differs, show the diff and merge without discarding local edits. If ownership is unclear, stop and ask before replacing it.

Copy `<pack>/agents/issue-bot-reader.md` and `<pack>/agents/issue-bot-editor.md` to `.claude/agents/`. Check that neither file's `tools` line names an MCP tool. That line is the only thing keeping workers away from Slack.

A cloud run doesn't install plugins, so the coder-stack skills the operational files name must be committed as project skills. Copy each of these directories from `${CLAUDE_SKILL_DIR}/../<name>/` to `.claude/skills/<name>/`:

- `how`
- `why`
- `tdd`
- `unslop`
- `principle-separate-before-serializing-shared-state`
- `principle-minimize-reader-load`
- `principle-guard-the-context-window`
- `principle-sequence-verifiable-units`
- `principle-fix-root-causes`
- `principle-prove-it-works`

The copied set is self-contained for the runs. No copied skill hands off to coder-mode. Two copies mention a coder-stack skill that isn't copied, **show-me-your-work** and **build-the-lever**, as pointers rather than steps, so a run that can't load them loses nothing it needs.

Tell the user two things about the copies. In this repository, the short form `/how` now runs the project copy, while `/coder-stack:how` still runs the plugin's. And the copies don't update with the plugin, so rerun this step after a coder-stack update.

## 2. Write the configuration

Create user-owned copies outside `.claude/automations/issue-bot/`, so a pack refresh never touches them:

- `.claude/issue-bot/configuration.yaml`, from `<pack>/templates/configuration.example.yaml`
- `.claude/issue-bot/routing.md`, from `<pack>/references/routing.example.md`, only if the user wants reroutes or owner pings

Cloud runs read these from the clone, so they get committed with everything else. Keep them free of secrets and private IDs that shouldn't be in the repository.

Ask for or confirm:

- Source Slack channel ID, and an optional operations channel ID
- Repository URL and default branch
- Triage identity: the Slack user ID of the account the Slack connector is linked to. Runs post as the task owner's linked accounts, so both tasks post as this user. Anyone posting from that account can forge a marker, so a shared or personal account here is a choice the user makes knowingly.
- Tracker connector, team, project, labels, and intake status
- Optional routing map path
- Control skill name and feature-map path (step 5)
- Budgets, including the sweep lookback and the per-run cap
- Worker models: `models.code` and `models.media_review`, each one of `opus`, `sonnet`, `haiku`, or `fable`

The operational files read every key in the template by name. Don't add keys they don't read: a key that does nothing when set misleads whoever edits it later. Triggers and each task's own model aren't configuration keys. The user picks them on the task in step 6.

The source channel, triage identity, repository, tracker connector, control skill, and feature map must be explicit. Stop setup while any of them is ambiguous.

## 3. Check the connectors and GitHub access

Both tasks need:

- The Slack connector on the user's claude.ai account, with read and thread-reply access to the source channel. Repro also needs `slack_get_reactions` and `slack_add_reaction`, file upload if it attaches evidence, and posting access to the operations channel when one is configured.
- GitHub access that can clone the repository and push `claude/`-prefixed branches. Repro opens draft pull requests.

Triage also needs the tracker connector, with search, read, create, and update access, and a way to cancel or close an issue it created. If an operation is missing, triage fails closed for that write.

Connectors added locally with `claude mcp add` don't reach cloud runs. A server the tasks need must be a claude.ai connector, or be declared in the repository's committed `.mcp.json`.

## 4. Commit the guardrails

Merge `<pack>/templates/settings.example.json` into `.claude/settings.json`. Replace `SOURCE_CHANNEL_ID` in the hook's `args` with the source channel ID. Don't add the operations channel: repro opens one root status message there. Keep every unrelated key. Validate the JSON afterwards.

- The PreToolUse hook runs on every Slack tool. From a subagent it allows only Slack reads. In a guarded channel it denies a post or file share that isn't a plain thread reply. It also denies every Slack write while its args are empty or still say `SOURCE_CHANNEL_ID`. It runs for everyone who uses Claude Code in this repository, not only the tasks.
- The handler sets `"onFailure": "block"`, so a missing script, a crash, or a timeout denies the call instead of letting it through. That field needs Claude Code v2.1.295 or later. Cloud runs use a current version. Check `claude --version` for teammates who run locally.
- The `ask` rules on `gh pr merge` and `gh pr ready` make a run pause for a person instead of merging. They prompt teammates too. If the team merges through Claude, they can keep the rule or drop it.

Run the hook's tests from the pack copy: `node --test .claude/automations/issue-bot/hooks/guard-slack-thread.test.mjs`.

Append `<pack>/templates/claude-md.example.md` to the repository's `CLAUDE.md`, with the channel ID filled in. Cloud runs start in auto mode, and auto mode's classifier reads `CLAUDE.md`. Auto mode's own `autoMode` settings block doesn't reach a cloud run from the repository or from the user's machine. [`docs/automations.md`](../../docs/automations.md) explains which layer applies where.

## 5. Set up the control skill

Read `<pack>/references/control-adapter.md`.

If the repository has no verification skill, offer `/create-verification-skill`. It writes `.claude/skills/verify-<app>/` with a `features/` map, which become `control.skill_name` and `control.feature_map_path`. Check each mapped feature against `<pack>/references/feature-map.example.md`, and fill missing reset steps, evidence, and cross-checks with `/maintain-verification-skill`.

The repro task runs in a cloud VM. Its cloud environment's setup script must install what the control skill needs, such as browsers and Playwright. Run the contract's nine-step setup check in a cloud session on this repository, using that environment. Leave the repro task disabled until all nine steps pass there.

## 6. Prepare the tasks

Tell the user that `.claude/automations/issue-bot/`, `.claude/agents/`, the copied skills, `.claude/issue-bot/`, `.claude/settings.json`, and the `CLAUDE.md` lines must be committed on the default branch before either task runs. Cloud runs clone the default branch.

Fill `<pack>/templates/triage-task-prompt.md` and `<pack>/templates/reproduce-task-prompt.md` from the configuration. Run each through the **unslop** skill and give the user both texts.

Create both tasks outside any Claude project. A task created in a project runs as a project thread, which loads the repository's `CLAUDE.md` but not its skills, agents, hooks, or permission rules. Such a run loses the Slack guard, the merge checkpoint, the workers, and the copied skills, and nothing warns about it.

Ask which triggers each task gets: API, an hourly schedule, or both. Both is the default. Ask which model each task runs on. Sonnet for triage and opus for repro are the defaults.

Create triage completely before starting repro. For each task, walk the user through:

1. At [claude.ai/code/routines](https://claude.ai/code/routines), not inside a project, create the task. Name it `issue-bot-triage` or `issue-bot-reproduce`. Give it the filled prompt, this one repository, the cloud environment from step 5, and the chosen model.
2. On the **Connectors** tab, keep only Slack and, for triage, the tracker connector. Remove the rest.
3. Add the chosen triggers:
   - **Schedule:** hourly. That is the shortest interval the tasks allow.
   - **API:** select **API** and click **Create**. Copy the token from the dialog, which shows it once. It goes into the relay's secret store, never into chat. Copy the **Fire URL** from the task's **Edit** dialog.

Fires are capped at 30 per hour per task. A channel busier than that needs the schedule trigger as a backstop, since fires past the cap fail.

### The relay

An API trigger needs something to fire it on each new report. Claude Code has no Slack trigger. The relay is a small Slack app the user runs, using the Events API or Socket Mode, subscribed to messages in the source channel. For each new message that is top level, with no `thread_ts` and no `subtype`, it POSTs once to each task's Fire URL. The body is `{"text": "{\"source_channel_id\":\"C…\",\"message_ts\":\"…\"}"}`, with the headers that the **make-bot-ui** skill lists. A failed POST gets logged and isn't retried, and the hourly sweep picks up what it missed. The **make-bot-ui** skill builds the same POST from a button. Here the trigger is a Slack event instead.

Without a relay, use the schedule trigger only. Triage then answers within about an hour.

## 7. Test thread safety

Use a test channel or a harmless report. Confirm first that every file from step 6 is committed on the default branch and that both prompts name their exact operational file. If any check fails, the tasks can't be enabled yet.

Verify:

1. Triage freezes the root thread and posts exactly one verdict as a reply.
2. The verdict carries exactly one configured marker.
3. Repro accepts the marker only from the configured triage identity.
4. Repro keeps the same source coordinates and claims the report with the `seen` reaction.
5. No root message appears in the source channel.
6. A worker can't write to Slack. The guard hook's tests pass, and both agent files list no MCP tools.
7. Missing coordinates, a deleted parent, or a failed preflight produces no post and no tracker issue.

Read each run's transcript from the task's detail page, or ask `/schedule` why a run did what it did. Turn on normal traffic only after all seven checks pass.
