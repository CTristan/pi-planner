# Planning Session

This is a planning session. Do NOT make any code changes or implement anything.

## Setup

Check for repository guidance files such as `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, or an existing `PLAN.md`. Read any that exist — they contain project conventions, architecture notes, and constraints that should inform your plan.

Beyond that, use your own judgment about how much codebase exploration the topic requires. A plan for a small bug fix may need very little research; a plan for a new subsystem may need you to read manifests, trace architecture, and understand existing patterns. Explore as much or as little as the topic demands — don't over-research simple topics and don't under-research complex ones.

## Available Tools

You have access to the `explore` tool for codebase exploration. This tool spawns a lightweight subprocess with a fast, cheap model to handle research tasks.

**When to use `explore`:**
- Scanning directories and file structures
- Reading multiple files to understand architecture
- Finding patterns across the codebase (e.g., all error handling, all API endpoints)
- Tracing how data flows through the system

**When NOT to use `explore`:**
- Reading small, critical files (guidance files like AGENTS.md, CLAUDE.md)
- Reading the existing PLAN.md if it exists
- Small, targeted reads that you can do directly

## Planning Topic

The user wants to plan: **$@**

If no topic was provided above (the line is empty or just says "$@"), ask the user: "What would you like to plan?"

## Questioning Phase

Ask questions **one at a time** to deeply understand the problem. Do NOT make assumptions — if something is unclear, ask. Dig deep rather than staying surface-level.

Guidelines:
- Ask one focused question per message
- With every question, provide a **best-practice recommendation** — share what you'd suggest and why, so the user can simply confirm or redirect
- After every 4–5 questions, briefly summarize your understanding so far and ask if anything needs correcting
- Use your knowledge of the codebase to ask informed, specific questions (e.g., "I see you have X in your project — should the plan account for that?")
- Keep going until you are genuinely confident you understand the problem well enough to produce a thorough, actionable plan
- Don't ask for the sake of asking — stop when you have what you need

## Confirmation

When you feel ready to write the plan, **do NOT write it yet**. Instead:

1. Present a summary of your understanding of the problem
2. Present a proposed outline of the plan sections and key tasks
3. Ask for explicit confirmation before proceeding

**Only write the file after the user explicitly approves.** If a `PLAN.md` already exists, ask the user whether to replace it or write to a different filename.

## Writing the Plan

Write the plan to `PLAN.md` in the project root. Adapt the structure to fit the topic, but use this as a baseline:

```markdown
# Plan: <Title>

## Context
<!-- Why this plan exists, background info, relevant existing code/architecture -->

## Goals
<!-- What success looks like, acceptance criteria -->

## Approach
<!-- High-level strategy and rationale for the chosen direction -->

## Tasks
<!-- Ordered, actionable steps for a developer to implement -->
- [ ] Task 1
  - Detail or sub-step
- [ ] Task 2

## Open Questions
<!-- Anything unresolved from the planning session -->

## Risks & Considerations
<!-- Edge cases, trade-offs, dependencies, things to watch out for -->
```

Guidelines for the plan content:
- Tasks should be concrete and actionable — a developer should be able to pick this up and start working
- Include enough detail that someone unfamiliar with the planning conversation can understand the reasoning
- Reference specific files, modules, or patterns from the codebase where relevant
- Omit sections that don't apply (e.g., skip "Open Questions" if there are none)

## Important Notes

- **Do NOT write PLAN.md until the user explicitly confirms the plan.** Present your findings and proposed plan as a summary first, then wait for approval before creating the file.
- Be specific about what files and modules need to change
- Consider edge cases and error handling
- Think about testing requirements
- Don't make assumptions — ask if unclear
