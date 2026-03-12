/**
 * Interactive configuration wizard for pi-planner.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import {
  Container,
  fuzzyFilter,
  getEditorKeybindings,
  Input,
  type SettingItem,
  SettingsList,
  Spacer,
  Text,
} from "@mariozechner/pi-tui";
import { type ConfigScope, loadConfig, saveConfig } from "./config.js";

/**
 * Model item for the selector.
 */
interface ModelItem {
  provider: string;
  id: string;
  label: string;
}

/**
 * Simple theme interface for the model selector.
 */
interface SimpleTheme {
  color: (name: string, text: string) => string;
}

/**
 * Theme colors for the model selector.
 */
function getModelSelectorTheme(theme: SimpleTheme) {
  return {
    accent: (text: string) => theme.color("accent", text),
    muted: (text: string) => theme.color("muted", text),
    success: (text: string) => theme.color("success", text),
  };
}

/**
 * Interactive model selector component - similar to pi's /model command.
 * Features:
 * - Search input to filter models
 * - Fuzzy filtering by model ID and provider
 * - Arrow key navigation
 * - Enter to select
 * - Shows current model with checkmark
 */
class ModelSelectorComponent extends Container {
  private searchInput: Input;
  private listContainer: Container;
  private allModels: ModelItem[] = [];
  private filteredModels: ModelItem[] = [];
  private selectedIndex = 0;
  private currentModelId: string;
  private theme: SimpleTheme;
  private onSelect: (model: string) => void;
  private onCancel: () => void;

  constructor(
    theme: SimpleTheme,
    models: ModelItem[],
    currentModel: string | undefined,
    onSelect: (model: string) => void,
    onCancel: () => void,
  ) {
    super();
    this.theme = theme;
    this.allModels = models;
    this.currentModelId = currentModel ?? "";
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    // Parse current model to get provider/id
    let currentProvider = "";
    let currentId = "";
    if (currentModel?.includes("/")) {
      const parts = currentModel.split("/");
      currentProvider = parts[0] ?? "";
      currentId = parts.slice(1).join("/");
    }

    // Sort models: current model first, then by provider
    this.allModels.sort((a, b) => {
      const aIsCurrent = a.provider === currentProvider && a.id === currentId;
      const bIsCurrent = b.provider === currentProvider && b.id === currentId;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return a.provider.localeCompare(b.provider);
    });

    this.filteredModels = this.allModels;
    this.selectedIndex = Math.min(
      this.selectedIndex,
      Math.max(0, this.filteredModels.length - 1),
    );

    // Add hint about filtering
    this.addChild(
      new Text(this.theme.color("muted", "Type to filter models"), 0, 0),
    );
    this.addChild(new Spacer(1));

    // Create search input
    this.searchInput = new Input();
    this.searchInput.onSubmit = () => {
      const selected = this.filteredModels[this.selectedIndex];
      if (selected) {
        this.handleSelect(selected);
      }
    };
    this.addChild(this.searchInput);
    this.addChild(new Spacer(1));

    // Create list container
    this.listContainer = new Container();
    this.addChild(this.listContainer);
    this.addChild(new Spacer(1));

    // Initial render
    this.updateList();
  }

  private updateList(): void {
    this.listContainer.clear();
    const theme = getModelSelectorTheme(this.theme);
    const maxVisible = 10;

    const startIndex = Math.max(
      0,
      Math.min(
        this.selectedIndex - Math.floor(maxVisible / 2),
        this.filteredModels.length - maxVisible,
      ),
    );
    const endIndex = Math.min(
      startIndex + maxVisible,
      this.filteredModels.length,
    );

    // Show visible slice of filtered models
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.filteredModels[i];
      if (!item) continue;

      const isSelected = i === this.selectedIndex;
      const isCurrent =
        item.provider === this.currentModelId.split("/")[0] &&
        item.id === this.currentModelId.split("/").slice(1).join("/");

      let line = "";
      if (isSelected) {
        const prefix = theme.accent("→ ");
        const modelText = `${item.id}`;
        const providerBadge = theme.muted(`[${item.provider}]`);
        const checkmark = isCurrent ? theme.success(" ✓") : "";
        line = `${prefix}${theme.accent(modelText)} ${providerBadge}${checkmark}`;
      } else {
        const modelText = `  ${item.id}`;
        const providerBadge = theme.muted(`[${item.provider}]`);
        const checkmark = isCurrent ? theme.success(" ✓") : "";
        line = `${modelText} ${providerBadge}${checkmark}`;
      }

      this.listContainer.addChild(new Text(line, 0, 0));
    }

    // Add scroll indicator if needed
    if (startIndex > 0 || endIndex < this.filteredModels.length) {
      const scrollInfo = theme.muted(
        `  (${this.selectedIndex + 1}/${this.filteredModels.length})`,
      );
      this.listContainer.addChild(new Text(scrollInfo, 0, 0));
    }

    // Show "no results" if empty
    if (this.filteredModels.length === 0) {
      this.listContainer.addChild(
        new Text(theme.muted("  No matching models"), 0, 0),
      );
    }
  }

  private filterModels(query: string): void {
    this.filteredModels = query
      ? fuzzyFilter(
          this.allModels,
          query,
          ({ id, provider }) => `${id} ${provider}`,
        )
      : this.allModels;
    this.selectedIndex = Math.min(
      this.selectedIndex,
      Math.max(0, this.filteredModels.length - 1),
    );
    this.updateList();
  }

  handleInput(keyData: string): void {
    const kb = getEditorKeybindings();

    // Up arrow
    if (kb.matches(keyData, "selectUp")) {
      if (this.filteredModels.length === 0) return;
      this.selectedIndex =
        this.selectedIndex === 0
          ? this.filteredModels.length - 1
          : this.selectedIndex - 1;
      this.updateList();
    }
    // Down arrow
    else if (kb.matches(keyData, "selectDown")) {
      if (this.filteredModels.length === 0) return;
      this.selectedIndex =
        this.selectedIndex === this.filteredModels.length - 1
          ? 0
          : this.selectedIndex + 1;
      this.updateList();
    }
    // Enter
    else if (kb.matches(keyData, "selectConfirm")) {
      const selected = this.filteredModels[this.selectedIndex];
      if (selected) {
        this.handleSelect(selected);
      }
    }
    // Escape
    else if (kb.matches(keyData, "selectCancel")) {
      this.onCancel();
    }
    // Pass everything else to search input
    else {
      this.searchInput.handleInput(keyData);
      this.filterModels(this.searchInput.getValue());
    }
  }

  private handleSelect(model: ModelItem): void {
    this.onSelect(`${model.provider}/${model.id}`);
  }
}

/**
 * Fetches available models from pi's model registry.
 */
async function getAvailableModels(
  ctx: ExtensionContext,
): Promise<Array<{ provider: string; id: string }>> {
  if (typeof ctx.modelRegistry?.getAvailable !== "function") {
    return [];
  }

  try {
    const models = await Promise.resolve(ctx.modelRegistry.getAvailable());
    return models.map((model) => ({
      provider: model.provider,
      id: model.id,
    }));
  } catch {
    return [];
  }
}

/**
 * Handles model selection - shows interactive model selector (like /model command).
 */
async function selectModel(
  ctx: ExtensionContext,
  currentValue: string,
  allowClear: boolean,
): Promise<string | undefined> {
  const availableModels = await getAvailableModels(ctx);

  if (availableModels.length === 0) {
    // Fall back to simple input if no models available
    return ctx.ui.input("Enter model (provider/id format):", currentValue);
  }

  // Convert to ModelItem format
  const modelItems: ModelItem[] = availableModels.map((m) => ({
    provider: m.provider,
    id: m.id,
    label: `${m.provider}/${m.id}`,
  }));

  // Build options for the initial select if allowClear
  if (allowClear) {
    const options = ["Clear (not set)", "Choose from available models..."];
    const initialChoice = await ctx.ui.select("Select model:", options);
    if (!initialChoice) return undefined;
    if (initialChoice === "Clear (not set)") return "";
  }

  // Use custom component for model selection (like /model command)
  return new Promise((resolve) => {
    ctx.ui
      .custom<string | null>((_tui, _theme, _kb, done) => {
        const container = new Container();

        // Create a simple theme adapter for pi-tui components
        const simpleTheme: SimpleTheme = {
          color: (name: string, text: string) => {
            // Map common theme names to basic styling
            if (name === "accent") return `\x1b[36m${text}\x1b[0m`; // Cyan
            if (name === "success") return `\x1b[32m${text}\x1b[0m`; // Green
            if (name === "muted") return `\x1b[90m${text}\x1b[0m`; // Gray
            return text;
          },
        };

        const modelSelector = new ModelSelectorComponent(
          simpleTheme,
          modelItems,
          currentValue,
          (model) => {
            done(model);
          },
          () => done(null),
        );

        container.addChild(modelSelector);

        return {
          render: (w: number) => container.render(w),
          invalidate: () => container.invalidate(),
          handleInput: (data: string) => modelSelector.handleInput(data),
        };
      })
      .then((result) => {
        if (result === null) {
          resolve(undefined);
        } else {
          resolve(result ?? undefined);
        }
      });
  });
}

/**
 * Runs the configuration wizard.
 */
export async function runConfigWizard(ctx: ExtensionContext): Promise<void> {
  // Step 1: Choose scope via simple select (this is fine, only 2 options)
  const scopeChoice = await ctx.ui.select("Choose configuration scope:", [
    "Global (~/.pi/planner.json)",
    "Project (.pi/planner.json)",
  ]);
  if (!scopeChoice) {
    return;
  }

  const scope: ConfigScope =
    scopeChoice === "Global (~/.pi/planner.json)" ? "global" : "project";

  // Main loop - allow editing multiple settings
  let done = false;
  while (!done) {
    // Reload config for each iteration to get fresh values
    const currentConfig = loadConfig(ctx);

    // Build settings list items - use values array with single item to trigger onChange
    const items: SettingItem[] = [
      {
        id: "exploreModel",
        label: "Explore model",
        currentValue: currentConfig.exploreModel,
        values: [currentConfig.exploreModel], // Single value - will trigger onChange on Enter
      },
      {
        id: "planningModel",
        label: "Planning model",
        currentValue: currentConfig.planningModel ?? "not set",
        values: [currentConfig.planningModel ?? "not set"],
      },
      {
        id: "exploreTools",
        label: "Explore tools",
        currentValue: currentConfig.exploreTools.join(", "),
        values: [currentConfig.exploreTools.join(", ")],
      },
      {
        id: "outputPath",
        label: "Output path",
        currentValue: currentConfig.outputPath,
        values: [currentConfig.outputPath],
      },
      {
        id: "guidanceFiles",
        label: "Guidance files",
        currentValue: currentConfig.guidanceFiles.join(", "),
        values: [currentConfig.guidanceFiles.join(", ")],
      },
    ];

    // Run the settings list
    const selectedId = await ctx.ui.custom<string | null>(
      (_tui, _theme, _kb, done) => {
        const container = new Container();

        const settingsList = new SettingsList(
          items,
          8, // Fixed height to ensure it fits in terminal
          getSettingsListTheme(),
          async (id) => {
            // On Enter press, close settings list and handle editing
            done(id);
          },
          () => done(null), // On Escape, close without selection
        );
        container.addChild(settingsList);

        return {
          render: (w) => container.render(w),
          invalidate: () => container.invalidate(),
          handleInput: (data) => settingsList.handleInput?.(data),
        };
      },
    );

    if (!selectedId) {
      done = true;
      continue;
    }

    // Handle the selected setting
    const config = loadConfig(ctx); // Reload fresh config

    switch (selectedId) {
      case "exploreModel": {
        const newValue = await selectModel(ctx, config.exploreModel, false);
        if (newValue) {
          saveConfig(scope, { exploreModel: newValue }, ctx.cwd);
          ctx.ui.notify(`Saved: explore model set to "${newValue}"`, "info");
        }
        break;
      }

      case "planningModel": {
        const newValue = await selectModel(
          ctx,
          config.planningModel ?? "",
          true,
        );
        if (newValue !== undefined) {
          if (newValue === "") {
            // Clear planning model - omit from config
            const { planningModel: _, ...rest } = config;
            saveConfig(
              scope,
              rest as unknown as {
                exploreModel?: string;
                exploreTools?: string[];
                outputPath?: string;
                guidanceFiles?: string[];
              },
              ctx.cwd,
            );
            ctx.ui.notify("Saved: planning model cleared", "info");
          } else {
            saveConfig(scope, { planningModel: newValue }, ctx.cwd);
            ctx.ui.notify(`Saved: planning model set to "${newValue}"`, "info");
          }
        }
        break;
      }

      case "exploreTools": {
        const newValue = await ctx.ui.input(
          "Enter explore tools (comma-separated):",
          config.exploreTools.join(", "),
        );
        if (newValue) {
          const tools = newValue
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
          saveConfig(scope, { exploreTools: tools }, ctx.cwd);
          ctx.ui.notify(
            `Saved: explore tools set to [${tools.join(", ")}]`,
            "info",
          );
        }
        break;
      }

      case "outputPath": {
        const newValue = await ctx.ui.input(
          "Enter output path for PLAN.md:",
          config.outputPath,
        );
        if (newValue) {
          saveConfig(scope, { outputPath: newValue }, ctx.cwd);
          ctx.ui.notify(`Saved: output path set to "${newValue}"`, "info");
        }
        break;
      }

      case "guidanceFiles": {
        const newValue = await ctx.ui.input(
          "Enter guidance files (comma-separated):",
          config.guidanceFiles.join(", "),
        );
        if (newValue) {
          const files = newValue
            .split(",")
            .map((f: string) => f.trim())
            .filter(Boolean);
          saveConfig(scope, { guidanceFiles: files }, ctx.cwd);
          ctx.ui.notify(
            `Saved: guidance files set to [${files.join(", ")}]`,
            "info",
          );
        }
        break;
      }

      default:
        done = true;
    }
  }
}
