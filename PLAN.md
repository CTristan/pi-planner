# Plan: Fix Topic Injection, Add Planning Model, Fix Wizard Scrolling

## Overview

Three issues to address in pi-planner:

1. **Topic not injected** — `/planning add auth` sends literal `{{topic}}` to the LLM instead of "add auth"
2. **No planning model config** — No way to auto-switch to a specific model for planning sessions
3. **Wizard doesn't scroll** — `/planning-config` uses simple `ctx.ui.select()` instead of `SettingsList`

## Issue 1: Fix Topic Injection in Prompt Template

### Root Cause

`prompts/planning.md` uses `{{topic}}` placeholder syntax, but pi's prompt template system uses positional arguments (`$1`, `$@`, `${@:N}`). The `{{topic}}` is never substituted.

Additionally, `extractPlanningTopic()` in `src/context.ts` exists but is dead code — never called anywhere.

### Changes

**`prompts/planning.md`** — Replace `{{topic}}` with `$@`:

```markdown
# Before
You are conducting a planning session. The user wants to plan: **{{topic}}**

# After
You are conducting a planning session. The user wants to plan: **$@**
```

**`src/context.ts`** — Remove dead code:

- Remove `extractPlanningTopic()` function (unused, no callers)

**`tests/context.test.ts`** — Remove tests for dead code:

- Remove `describe("extractPlanningTopic", ...)` block

### Testing

- Verify the prompt template is valid by checking `$@` syntax matches pi docs
- Existing tests for `isPlanningInvocation` remain (that function is still used in `index.ts`)

---

## Issue 2: Add Planning Model Configuration

### Design

Add a `planningModel` config option (same `"provider/id"` format as `exploreModel`). When a planning session starts, the extension switches to this model via `pi.setModel()`. Optionally restore the previous model after planning ends (on `agent_end`).

The model string is stored as `"provider/id"` (e.g., `"anthropic/claude-sonnet-4-5"`), parsed at runtime into provider + model ID for `ctx.modelRegistry.find()`.

Default: `undefined` (no model switch — keep whatever model is active).

### Changes

**`src/types.ts`** — Add config field:

```typescript
export interface PlannerConfig {
  // ... existing fields ...
  /** Model to switch to for planning sessions (provider/id format). Undefined = no switch. */
  planningModel?: string;
}

export interface PlannerConfigResolved {
  // ... existing fields ...
  planningModel: string | undefined;
}

export const DEFAULT_CONFIG: PlannerConfigResolved = {
  // ... existing fields ...
  planningModel: undefined,
};
```

**`src/config.ts`** — Update merge logic:

- Add `planningModel` to `mergeConfig()` defaults (pass through `undefined` as valid)
- Add `planningModel` to `saveConfig()` field handling
- Add `planningModel` to `getConfigDisplay()` output

**`src/context.ts`** — Store topic in planning state:

- Add `topic: string` to `PlanningState` interface
- Update `activatePlanningMode()` to accept and store topic
- Add `getPlanningTopic()` getter
- Note: topic isn't needed for model switching, but useful for context message generation

**`index.ts`** — Implement model switching:

```typescript
// In the extension factory, capture pi reference for model switching
export default function plannerExtension(pi: ExtensionAPI) {
  let previousModel: { provider: string; id: string } | undefined;

  // On input, extract topic and activate planning mode
  pi.on("input", (event: { text: string }) => {
    if (isPlanningInvocation(event.text)) {
      // Extract topic for state tracking
      const topic = event.text.trim().replace(/^\/planning\s*/, "").trim();
      activatePlanningMode(topic);
    }
  });

  // Before agent starts, switch model if configured
  pi.on("before_agent_start", (_event, ctx) => {
    if (!isPlanningModeActive()) return;

    const config = loadConfig(ctx);

    // Switch model if planningModel is configured
    if (config.planningModel) {
      const [provider, ...idParts] = config.planningModel.split("/");
      const modelId = idParts.join("/");
      if (provider && modelId) {
        // Save current model for restoration
        previousModel = ctx.model
          ? { provider: ctx.model.provider, id: ctx.model.id }
          : undefined;

        const model = ctx.modelRegistry?.find(provider, modelId);
        if (model) {
          pi.setModel(model);
        }
      }
    }

    // Inject context message (existing logic)
    const contextMessage = generateContextMessage(ctx);
    if (contextMessage) {
      return {
        message: {
          customType: "planning-context",
          content: contextMessage,
          display: false,
        },
      };
    }

    deactivatePlanningMode();
  });

  // Restore model after planning session ends
  pi.on("agent_end", (_event, ctx) => {
    if (previousModel) {
      const model = ctx.modelRegistry?.find(
        previousModel.provider,
        previousModel.id,
      );
      if (model) {
        pi.setModel(model);
      }
      previousModel = undefined;
    }
  });
}
```

> **Note:** The current `index.ts` uses `pi.sendMessage()` inside `before_agent_start`, but the pi API expects `before_agent_start` handlers to **return** a `{ message, systemPrompt }` object. This is a pre-existing bug that should be fixed as part of this work.

### Changes to Wizard (covered in Issue 3 below)

- Add `planningModel` to the SettingsList configuration UI

### Testing

**`tests/config.test.ts`** — Add tests:

- `loadConfig` returns `undefined` for `planningModel` by default
- `saveConfig` persists `planningModel`
- `getConfigDisplay` includes `planningModel` (shows "not set" when undefined)

**`tests/context.test.ts`** — Add tests:

- `activatePlanningMode` stores topic
- `getPlanningTopic` returns stored topic
- Planning state resets topic on deactivation

**`tests/index.test.ts`** (new file) — Integration tests with mocked `ExtensionAPI`:

- Model switch occurs when `planningModel` is configured and planning mode is active
- Model is restored on `agent_end`
- No model switch when `planningModel` is undefined
- Handles invalid `planningModel` format gracefully (no provider/id split)
- `before_agent_start` returns message object (not calling `pi.sendMessage()`)

---

## Issue 3: Fix Wizard Scrolling

### Root Cause

The wizard uses `ctx.ui.select()` (a basic dialog) for all menus. Pi's built-in configuration UIs use `ctx.ui.custom()` with `SettingsList` component, which provides proper scrolling, keyboard navigation, and consistent styling.

### Design

Rewrite `/planning-config` to use `SettingsList` from `@mariozechner/pi-tui` with `getSettingsListTheme()` from `@mariozechner/pi-coding-agent`, following the Pattern 3 from pi's tui.md documentation and the `tools.ts` example extension.

All settings become toggle/cycle items in a single scrollable list:

| Setting | Values | Display |
|---------|--------|---------|
| `exploreModel` | Text input (custom flow) | Current model string |
| `planningModel` | Text input (custom flow) | Current model string or "not set" |
| `exploreTools` | Text input (custom flow) | Comma-separated list |
| `outputPath` | Text input (custom flow) | Current path |
| `guidanceFiles` | Text input (custom flow) | Comma-separated list |
| `scope` | `global` / `project` | Toggle between scopes |

Since `SettingsList` works with discrete value cycling, settings that need free-text input (model names, paths, tool lists) will use a hybrid approach:

1. Selecting a setting in the `SettingsList` opens a `ctx.ui.input()` dialog for editing
2. For `exploreModel` and `planningModel`, optionally show available models from `ctx.modelRegistry` via `SelectList` first, with a "Custom..." option that falls back to `ctx.ui.input()`

### Changes

**`src/wizard.ts`** — Full rewrite:

```typescript
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, type SettingItem, SettingsList, Text } from "@mariozechner/pi-tui";

export async function runConfigWizard(ctx: ExtensionContext): Promise<void> {
  const config = loadConfig(ctx);

  // Step 1: Choose scope via simple select (this is fine, only 2 options)
  const scopeChoice = await ctx.ui.select("Choose configuration scope:", [
    "Global (~/.pi/planner.json)",
    "Project (.pi/planner.json)",
  ]);
  if (!scopeChoice) return;
  const scope: ConfigScope =
    scopeChoice === "Global (~/.pi/planner.json)" ? "global" : "project";

  // Step 2: Show settings list
  const items: SettingItem[] = [
    {
      id: "exploreModel",
      label: "Explore model",
      currentValue: config.exploreModel,
      values: [config.exploreModel], // Single value; Enter triggers custom edit
    },
    {
      id: "planningModel",
      label: "Planning model",
      currentValue: config.planningModel ?? "not set",
      values: [config.planningModel ?? "not set"],
    },
    {
      id: "exploreTools",
      label: "Explore tools",
      currentValue: config.exploreTools.join(", "),
      values: [config.exploreTools.join(", ")],
    },
    {
      id: "outputPath",
      label: "Output path",
      currentValue: config.outputPath,
      values: [config.outputPath],
    },
    {
      id: "guidanceFiles",
      label: "Guidance files",
      currentValue: config.guidanceFiles.join(", "),
      values: [config.guidanceFiles.join(", ")],
    },
  ];

  await ctx.ui.custom((_tui, theme, _kb, done) => {
    const container = new Container();
    container.addChild(
      new Text(theme.fg("accent", theme.bold("pi-planner Configuration")), 1, 1),
    );

    const settingsList = new SettingsList(
      items,
      Math.min(items.length + 2, 15),
      getSettingsListTheme(),
      async (id, _newValue) => {
        // On select, open input dialog for the selected setting
        done(id); // Close settings list, handle input outside
      },
      () => done(undefined),
    );

    container.addChild(settingsList);

    return {
      render: (w) => container.render(w),
      invalidate: () => container.invalidate(),
      handleInput: (data) => {
        settingsList.handleInput?.(data);
        _tui.requestRender();
      },
    };
  });

  // After custom UI closes, handle the selected setting edit via ctx.ui.input()
  // (Loop to allow editing multiple settings)
}
```

> **Implementation note:** The exact interaction pattern (whether `SettingsList` `onChange` directly opens `ctx.ui.input`, or closes first and reopens) needs to be tested. The `SettingsList` `onChange` callback fires when a value is cycled with Enter/←/→. For free-text editing, we may need to close the settings list, open `ctx.ui.input()`, save the value, then reopen the settings list in a loop. Follow the working pattern from `tools.ts` which uses `onChange` for immediate toggle + save.

### Testing

**`tests/wizard.test.ts`** — Rewrite with mocked `ctx.ui.custom`:

- Verify `SettingsList` items are built correctly from config
- Test scope selection (global vs project)
- Test that saving after edit persists correctly
- Mock `ExtensionContext` with `ui.custom`, `ui.select`, `ui.input`, `ui.notify`

---

## Implementation Order

1. **Issue 1: Fix topic injection** (smallest, no dependencies)
   - Update `prompts/planning.md` (`{{topic}}` → `$@`)
   - Remove `extractPlanningTopic()` dead code from `src/context.ts`
   - Remove associated tests from `tests/context.test.ts`

2. **Issue 2: Add planning model config** (types first, then logic)
   - Add `planningModel` to `src/types.ts`
   - Update `src/config.ts` (merge, save, display)
   - Update `src/context.ts` (topic in planning state)
   - Rewrite `index.ts` event handlers (fix `before_agent_start` return pattern, add model switching)
   - Add tests for all changes

3. **Issue 3: Fix wizard scrolling** (depends on Issue 2 for `planningModel` field)
   - Rewrite `src/wizard.ts` using `SettingsList` pattern
   - Rewrite `tests/wizard.test.ts`

4. **Coverage cleanup**
   - Raise coverage thresholds in `vitest.config.ts` from 30% to 80%
   - Add `tests/index.test.ts` for the extension entry point
   - Improve `explore.ts` coverage by mocking `child_process.spawn` for `executeExplore()`

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `prompts/planning.md` | Edit | `{{topic}}` → `$@` |
| `src/types.ts` | Edit | Add `planningModel` field |
| `src/config.ts` | Edit | Handle `planningModel` in merge/save/display |
| `src/context.ts` | Edit | Remove `extractPlanningTopic`, add topic to planning state |
| `src/wizard.ts` | Rewrite | Use `SettingsList` + `getSettingsListTheme()` |
| `index.ts` | Edit | Fix `before_agent_start` return, add model switch/restore |
| `tests/config.test.ts` | Edit | Add `planningModel` tests |
| `tests/context.test.ts` | Edit | Remove `extractPlanningTopic` tests, add topic state tests |
| `tests/wizard.test.ts` | Rewrite | Mock `ctx.ui.custom` with `SettingsList` |
| `tests/index.test.ts` | New | Extension entry point integration tests |
| `tests/explore.test.ts` | Edit | Add `executeExplore` tests with mocked spawn |
| `vitest.config.ts` | Edit | Raise coverage thresholds to 80% |

## Potential Challenges

- **`SettingsList` for free-text values**: `SettingsList` is designed for cycling discrete values (like "enabled"/"disabled"). For free-text fields (model name, path, file lists), we need a hybrid approach — either cycle triggers an input dialog, or we use `SelectList` for the menu and `ctx.ui.input()` for editing. Will need to test both patterns.
- **Model restoration timing**: `agent_end` fires after the agent loop. If the user interrupts (Ctrl+C), the model might not be restored. May need to also handle `session_shutdown`.
- **Mocking `pi.setModel()` in tests**: The extension entry point takes `ExtensionAPI` — need a good mock pattern for `setModel`, `on`, `registerTool`, `registerCommand`, and event handlers.
- **`before_agent_start` return type**: The current code uses `pi.sendMessage()` which is incorrect for this event. The handler should return `{ message, systemPrompt }`. Changing this fixes the architecture but needs careful testing.

## Success Criteria

- [ ] `/planning add authentication` results in the LLM seeing "add authentication" (not `{{topic}}` or `$@`)
- [ ] Setting `planningModel` in config causes automatic model switch during planning
- [ ] Model is restored after planning session completes
- [ ] `/planning-config` wizard scrolls correctly with keyboard navigation
- [ ] All tests pass (`npm test`)
- [ ] Coverage ≥ 80% on all metrics
- [ ] Type check clean (`npm run type-check`)
- [ ] Lint clean (`npm run check`)
