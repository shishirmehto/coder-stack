---
name: setup-coder-stack
description: Configure which Claude model coder-stack uses per role. Writes the repo's `.claude/coder-stack-models.md` sheet, which overrides the skill defaults. Use for /setup-coder-stack, "configure coder-stack models", or changing coder-stack's model choices.
---

# Setup coder-stack

Write `.claude/coder-stack-models.md`, the sheet that sets coder-stack's model per role in this repo. Every routed skill (`coder-mode`, `how`, `why`, `arena`, `swarm`, `architect`, `interrogate`, `reflect`) reads it when it spawns a subagent. A missing sheet or line falls back to that skill's default.

## Steps

### 1. Know the valid values

The Agent tool's `model` accepts `opus`, `sonnet`, `haiku`, and `fable`. Each is its own family. The aliases `inherit-parent` and `auto` are also valid. Both mean the role runs on the parent chat model, so omit `model` on the Agent call. Never write any other value.

Reasoning effort is not per-subagent in Claude Code. It follows the session's effort setting, so this sheet sets no budget.

### 2. Load current state

The defaults are the sheet shown in step 4. If `.claude/coder-stack-models.md` exists, read it and treat its role values as the current choices. A line whose role is not in step 4 is from a retired role. Drop it.

### 3. Show the roles and confirm

Show every role with its model and list each line step 2 dropped. Ask with AskUserQuestion whether to accept as-is or change specific roles, offering the four models plus `inherit-parent`. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only entries from a family other than the parent's, in list order, so order it by preference. An `inherit-parent` or `auto` entry never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Write the sheet

Overwrite the whole file so re-runs stay idempotent. Shape:

```
# coder-stack model configuration. One line per role. Delete a line to fall back to the skill default.
# Valid values: opus, sonnet, haiku, fable, inherit-parent, auto. Alias entries in a panel list still count toward its fan-out.
feature, refactoring: sonnet
bug-fix: sonnet
perf-issue: sonnet
hillclimb: sonnet
judgment and prose: opus
hardest tasks: opus
how explorer: sonnet
how explainer: opus
why investigators: sonnet
why synthesizer: opus
reflect tooling: sonnet
reflect judgment, divergent, synthesizer: opus
arena runners: opus, sonnet
arena cross-judge pool: opus, sonnet
swarm workers: sonnet
architect runners: opus, sonnet
interrogate reviewers: opus, sonnet
```

### 5. Confirm

Tell the user the sheet was written and takes effect on the next spawn. It is a repo file, so it is shared with everyone who works here once committed. Re-running this skill updates it.

### 6. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill in `.claude/skills/`, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill`. On no, move on without pushing.

### 7. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill`. On no, move on without pushing.
