/**
 * Context layering for pi-planner.
 *
 * Loads and combines planning context from global and project-local markdown files.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { loadConfig } from "./config.js";
import {
  GLOBAL_PLANNING_CONTEXT_PATH,
  PROJECT_PLANNING_CONTEXT_PATH,
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
 * Loads content from a planning context file.
 * Returns null if the file doesn't exist or cannot be read.
 * Returns empty string if the file exists but is empty.
 */
function loadContextFile(filePath: string): string | null {
  try {
    const expanded = expandPath(filePath);
    if (!fs.existsSync(expanded)) {
      return null;
    }
    const content = fs.readFileSync(expanded, "utf-8");
    // Return null if file is empty (after trimming)
    return content.trim() === "" ? "" : content;
  } catch {
    return null;
  }
}

/**
 * Loads planning context from global and project-local files.
 * Returns combined content with clear separators.
 *
 * Order:
 * 1. Global context (~/.pi/planning.md)
 * 2. Project context (.pi/planning.md in project directory)
 */
export function loadPlanningContext(cwd: string): string {
  const parts: string[] = [];

  // Load global context
  const globalContext = loadContextFile(GLOBAL_PLANNING_CONTEXT_PATH);
  if (globalContext) {
    parts.push("### Global Planning Context");
    parts.push(globalContext.trim());
    parts.push("");
  }

  // Load project context
  const projectPath = path.join(cwd, PROJECT_PLANNING_CONTEXT_PATH);
  const projectContext = loadContextFile(projectPath);
  if (projectContext) {
    parts.push("### Project Planning Context");
    parts.push(projectContext.trim());
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Checks if planning mode is being invoked based on the input.
 */
export function isPlanningInvocation(input: string): boolean {
  return input.trim().startsWith("/planning");
}

/**
 * Generates the full context message to inject before the agent starts.
 *
 * This includes:
 * - Output path configuration
 * - Guidance files to check
 * - Combined planning context (if any)
 */
export function generateContextMessage(ctx: ExtensionContext): string | null {
  const config = loadConfig(ctx);
  const { outputPath, guidanceFiles } = config;

  const parts: string[] = [];

  // Add configuration context
  parts.push("### Planning Configuration");
  parts.push(`Output path: ${outputPath}`);
  parts.push(`Guidance files to check: ${guidanceFiles.join(", ")}`);
  parts.push("");

  // Add planning context files
  const planningContext = loadPlanningContext(ctx.cwd);
  if (planningContext) {
    parts.push(planningContext);
    parts.push("");
  }

  return parts.length > 1 ? parts.join("\n") : null;
}

/**
 * Planning state for tracking whether we're in a planning session.
 */
interface PlanningState {
  active: boolean;
  topic: string;
}

const planningState: PlanningState = {
  active: false,
  topic: "",
};

/**
 * Activates planning mode with an optional topic.
 */
export function activatePlanningMode(topic: string = ""): void {
  planningState.active = true;
  planningState.topic = topic;
}

/**
 * Deactivates planning mode.
 */
export function deactivatePlanningMode(): void {
  planningState.active = false;
  planningState.topic = "";
}

/**
 * Checks if planning mode is currently active.
 */
export function isPlanningModeActive(): boolean {
  return planningState.active;
}

/**
 * Gets the current planning topic.
 */
export function getPlanningTopic(): string {
  return planningState.topic;
}

/**
 * Resets planning state (useful for testing).
 */
export function resetPlanningState(): void {
  planningState.active = false;
  planningState.topic = "";
}
