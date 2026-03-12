/**
 * Interactive configuration wizard for pi-planner.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import {
  Container,
  type SettingItem,
  SettingsList,
} from "@mariozechner/pi-tui";
import { type ConfigScope, loadConfig, saveConfig } from "./config.js";

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
 * Handles model selection - shows available models or allows custom input.
 */
async function selectModel(
  ctx: ExtensionContext,
  currentValue: string,
  allowClear: boolean,
): Promise<string | undefined> {
  const availableModels = await getAvailableModels(ctx);

  const modelOptions: string[] = [];
  if (allowClear) {
    modelOptions.push("Clear (not set)");
  }
  if (availableModels.length > 0) {
    modelOptions.push(...availableModels.map((m) => `${m.provider}/${m.id}`));
  }
  modelOptions.push("Custom model...");

  const selected = await ctx.ui.select("Select model:", modelOptions);
  if (!selected) {
    return undefined;
  }

  if (selected === "Custom model...") {
    return ctx.ui.input("Enter model (provider/id format):", currentValue);
  }

  if (selected === "Clear (not set)") {
    return "";
  }

  return selected;
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
