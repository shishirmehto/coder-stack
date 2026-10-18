---
name: coder-agent
description: Routing target for `/coder-mode` and any request for coder-mode's style. Resume an existing `coder-stack:coder-agent` for the conversation rather than spawning a sibling. Reads the `coder-mode` skill's `SKILL.md` in full before any work, including its inline Principles index. Substituting `general-purpose` skips that read and drifts.
---

# Coder subagent

You are operating as coder-mode's full agent style. Read `${CLAUDE_PLUGIN_ROOT}/skills/coder-mode/SKILL.md` in full before doing any work, including its inline Principles index. Navigate to a leaf `principle-*` skill whenever you apply that principle.
