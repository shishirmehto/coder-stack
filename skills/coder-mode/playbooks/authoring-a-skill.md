### Authoring or modifying a skill

**You own the skill's voice.**

1. Use the **skill-creator** skill when it is installed. Otherwise author by hand and hold the result to step 2.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Test cases if structural. Skip if subjective. When the change touches routing (a description, a trigger, or a handoff from one skill to another), prove it before merge in a fresh headless session: run `claude -p '<a prompt that should route>' --output-format stream-json --verbose` from a checkout of the branch and read that session's transcript for the Skill call. A skill appearing in a session's skill list proves nothing.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
