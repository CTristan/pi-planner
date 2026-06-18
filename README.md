# 🥧 Pi in the Sky / pi-planner

A Pi extension for planning sessions with cheap model exploration, context layering, and interactive configuration.

## Features

- **Cheap Model Exploration**: Delegate codebase exploration to fast, lightweight subprocesses via the `explore` tool
- **Interactive Configuration**: Manage all settings with the `/planning-config` command
- **Context Layering**: Global (`~/.pi/planning.md`) and project-local (`.pi/planning.md`) planning guidance files
- **Smart Defaults**: Pre-configured to use `github-copilot/gemini-3-flash-preview` for exploration

## Installation

### From npm

```bash
pi install @hemocode/pi-planner
```

### From local directory

```bash
pi install .
```

## Usage

### Planning Sessions

Start a planning session by invoking the `/planning` prompt template:

```
/planning Add user authentication
```

The LLM will:
1. Use the `explore` tool for heavy codebase research
2. Ask clarifying questions if needed
3. Present a summary of findings
4. Wait for your confirmation
5. Write a detailed `PLAN.md`

### The Explore Tool

The `explore` tool delegates exploration tasks to a cheap model subprocess. Use it for:
- Scanning directories and file structures
- Reading multiple files to understand architecture
- Finding patterns across the codebase
- Tracing data flow

**When NOT to use explore**:
- Reading small, critical files (guidance files, existing PLAN.md)
- Simple, targeted file reads

### Configuration

Run the interactive configuration wizard:

```
/planning-config
```

The wizard lets you configure:
- **Explore model**: Model to use for subprocess exploration
- **Explore tools**: Tools available to the exploration subprocess
- **Output path**: Where the generated PLAN.md is written
- **Guidance files**: Files to check before planning

## Configuration

### Global vs. Project-Local

Settings can be configured at two levels:

1. **Global** (`~/.pi/planner.json`): Applied to all projects
2. **Project** (`.pi/planner.json`): Overrides global settings for a specific project

### Config Schema

```json
{
  "exploreModel": "github-copilot/gemini-3-flash-preview",
  "exploreTools": ["read", "bash", "grep", "find", "ls"],
  "outputPath": "PLAN.md",
  "guidanceFiles": ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md", "PLAN.md"]
}
```

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `exploreModel` | Model for exploration subprocesses | `github-copilot/gemini-3-flash-preview` |
| `exploreTools` | Tools available in exploration subprocesses | `["read", "bash", "grep", "find", "ls"]` |
| `outputPath` | Output path for generated PLAN.md | `"PLAN.md"` |
| `guidanceFiles` | Files to check before planning | `["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md", "PLAN.md"]` |

## Context Files

### Global Context (`~/.pi/planning.md`)

Store your personal planning conventions here. Example:

```markdown
# My Planning Conventions

## Planning Process

1. Always start by understanding the problem space
2. Identify dependencies and blockers early
3. Consider edge cases and error handling
4. Plan for testing from the start

## Coding Standards

- TypeScript for all new code
- Use strict mode
- Write unit tests for all functions
- Document public APIs
```

### Project Context (`.pi/planning.md`)

Store project-specific planning guidance. Example:

```markdown
# Project Planning Guide

## Architecture

Follow hexagonal architecture:
- Domain layer in `src/domain/`
- Application layer in `src/application/`
- Infrastructure layer in `src/infrastructure/`
- Presentation layer in `src/presentation/`

## Testing

- Write tests before implementation (TDD)
- Use Vitest for unit tests
- Aim for 80%+ code coverage
- Mock external dependencies

## Code Style

- Use Biome for linting and formatting
- Follow existing naming conventions
- Keep functions small and focused
```

## How It Works

### Explore Tool Workflow

1. LLM receives a task (e.g., "Find all API endpoints")
2. The `explore` tool spawns: `pi --print --model <exploreModel> --tools <exploreTools> --no-session "<task>"`
3. The cheap model subprocess does the exploration work
4. Output is captured, truncated if necessary (50KB limit), and returned
5. The expensive model uses the findings to create the plan

### Context Injection

When `/planning` is invoked:

1. Extension detects the planning invocation
2. Loads config and context files
3. Injects a system message with:
   - Planning configuration (output path, guidance files)
   - Global planning context (if exists)
   - Project planning context (if exists)
4. Agent starts with full context

## Dependencies

### pi-model-selector

Full integration with `pi-model-selector` requires that it respects explicit model selection via the `--model` flag. See the [explicit model selection proposal](https://github.com/CTristan/pi-model-selector/blob/main/docs/explicit-model-selection-support.md) for details.

As a workaround, the `explore` tool sets the `PI_EXPLICIT_MODEL` environment variable to help avoid model overrides.

## Development

### Setup

```bash
npm install
```

### Type Check

```bash
npm run type-check
```

### Linting

```bash
npm run check
```

### Auto-fix Linting Issues

```bash
npm run fix
```

### Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### CI

```bash
npm run ci
```

## Project Structure

```
pi-planner/
├── index.ts                  # Extension entry point
├── src/
│   ├── types.ts              # Config types, defaults, constants
│   ├── config.ts             # Config loading, merging, saving
│   ├── wizard.ts             # /planning-config interactive wizard
│   ├── explore.ts            # explore tool (subprocess spawning)
│   └── context.ts            # Context layering (planning.md files)
├── prompts/
│   └── planning.md           # Base planning prompt template
├── tests/
│   ├── config.test.ts        # Config loading, merging, tests
│   ├── explore.test.ts       # Explore tool, truncation tests
│   ├── context.test.ts       # Context loading, layering tests
│   └── wizard.test.ts        # Config display tests
├── package.json              # pi.extensions + pi.prompts declarations
├── tsconfig.json
├── biome.json
└── README.md
```

## Contributing

Contributions are welcome! Please ensure:
- All tests pass: `npm test`
- Code is linted: `npm run check`
- Types are valid: `npm run type-check`

## License

MIT

## Related Projects

- [pi-model-selector](https://github.com/CTristan/pi-model-selector): Model selection with automatic switching
- [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent): Pi coding agent framework
