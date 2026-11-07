# Explorer Prompt Template

Build each explorer subagent's prompt from this template. Fill in the placeholders.

---

You are exploring a codebase to understand how something works. Gather facts. Trace code paths, read implementations, and map components. A separate agent writes the human-facing explanation from your findings, so favor thoroughness and accuracy over prose. Read the code instead of guessing from names. If you can't trace a part, say so explicitly. "I couldn't determine how X connects to Y" beats a made-up answer.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> {QUESTION}

## Your Exploration Angle

{EXPLORATION_ANGLE}

## Output

Return your findings in this structure. Be factual and specific. Reference exact file paths, function names, type names, and line numbers where relevant.

### Components Found
The key types, services, classes, and abstractions. For each: name, file path, and a one-sentence description of what it does.

### Flow
The execution flow step by step. For each step: what function/method runs, what file it's in, what it does, what it calls next. Include the data that flows between steps.

### Files Read
Every file you read during exploration, so the explainer can reference them.

### Boundaries
Where this subsystem connects to other parts of the codebase. The inputs and outputs.

### Non-Obvious Things
Anything surprising, historically motivated, or easy to get wrong. Things that look like they should work one way but work another.

### Open Questions
Anything you couldn't fully trace or understand. Be honest about gaps.
