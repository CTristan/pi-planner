/**
 * Configuration loading, merging, and saving for pi-planner.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
  DEFAULT_CONFIG,
  GLOBAL_CONFIG_PATH,
  type PlannerConfig,
  type PlannerConfigResolved,
  PROJECT_CONFIG_PATH,
} from "./types.js";

/**
 * Expands tilde (~) in file paths to the user's home directory.
 */
function expandPath(filePath: string): string {
  if (filePath.startsWith("~/") || filePath === "~") {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Reads and parses a JSON config file.
 * Returns null if the file doesn't exist or is invalid.
 */
function readConfigFile(filePath: string): PlannerConfig | null {
  try {
    const expanded = expandPath(filePath);
    if (!fs.existsSync(expanded)) {
      return null;
    }
    const content = fs.readFileSync(expanded, "utf-8");
    return JSON.parse(content) as PlannerConfig;
  } catch {
    return null;
  }
}

/**
 * Writes a config object to a JSON file.
 */
function writeConfigFile(filePath: string, config: PlannerConfig): void {
  const expanded = expandPath(filePath);
  const dir = path.dirname(expanded);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(expanded, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

/**
 * Deep partial type for nested objects.
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Merges two config objects, with override taking precedence.
 * Missing values fall back to defaults.
 */
function mergeConfig(
  base: PlannerConfig,
  override: DeepPartial<PlannerConfig>,
): PlannerConfigResolved {
  const result: PlannerConfig = { ...base };

  for (const key of Object.keys(override) as (keyof PlannerConfig)[]) {
    const value = override[key];
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  // Fill in defaults for missing keys
  // Note: exploreModel is intentionally left undefined to allow "any model" behavior
  return {
    exploreModel: result.exploreModel, // Can be undefined
    planningModel: result.planningModel ?? DEFAULT_CONFIG.planningModel,
    exploreTools: result.exploreTools ?? DEFAULT_CONFIG.exploreTools,
    outputPath: result.outputPath ?? DEFAULT_CONFIG.outputPath,
    guidanceFiles: result.guidanceFiles ?? DEFAULT_CONFIG.guidanceFiles,
  };
}

/**
 * Loads and merges configuration from global and project config files.
 * Project config overrides global config.
 */
export function loadConfig(ctx: ExtensionContext): PlannerConfigResolved {
  const globalConfig = readConfigFile(GLOBAL_CONFIG_PATH);
  const projectConfigPath = path.join(ctx.cwd, PROJECT_CONFIG_PATH);
  const projectConfig = readConfigFile(projectConfigPath);

  const merged = mergeConfig(globalConfig ?? {}, projectConfig ?? {});

  return merged;
}

/**
 * Configuration scope for saving.
 */
export type ConfigScope = "global" | "project";

/**
 * Saves configuration to the specified scope.
 */
export function saveConfig(
  scope: ConfigScope,
  config: PlannerConfig,
  cwd?: string,
): void {
  const filePath =
    scope === "global"
      ? GLOBAL_CONFIG_PATH
      : path.join(cwd ?? ".", PROJECT_CONFIG_PATH);

  // Merge with existing config to preserve other fields
  const existing = readConfigFile(filePath);
  const merged = mergeConfig(existing ?? {}, config);

  // Only save the fields that were explicitly set
  const toSave: PlannerConfig = {};
  if (config.exploreModel !== undefined && merged.exploreModel !== undefined) {
    toSave.exploreModel = merged.exploreModel;
  }
  if (
    config.planningModel !== undefined &&
    merged.planningModel !== undefined
  ) {
    toSave.planningModel = merged.planningModel;
  }
  if (config.exploreTools !== undefined) {
    toSave.exploreTools = merged.exploreTools;
  }
  if (config.outputPath !== undefined) {
    toSave.outputPath = merged.outputPath;
  }
  if (config.guidanceFiles !== undefined) {
    toSave.guidanceFiles = merged.guidanceFiles;
  }

  writeConfigFile(filePath, toSave);
}

/**
 * Gets the current configuration as a plain object for display.
 */
export function getConfigDisplay(
  config: PlannerConfigResolved,
): Record<string, string | string[]> {
  return {
    exploreModel: config.exploreModel ?? "Any",
    planningModel: config.planningModel ?? "not set",
    exploreTools: config.exploreTools.join(", "),
    outputPath: config.outputPath,
    guidanceFiles: config.guidanceFiles.join(", "),
  };
}
