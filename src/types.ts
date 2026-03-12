/**
 * Configuration types for pi-planner extension.
 */

import { Type } from "@sinclair/typebox";

/**
 * Configuration schema for the planner extension.
 */
export interface PlannerConfig {
  /** Model to use for exploration tasks (e.g., "github-copilot/gemini-3-flash-preview") */
  exploreModel?: string;
  /** Model to switch to for planning sessions (provider/id format). Undefined = no switch. */
  planningModel?: string;
  /** Tools to enable for the exploration subprocess */
  exploreTools?: string[];
  /** Output path for generated PLAN.md */
  outputPath?: string;
  /** Guidance files to check before planning */
  guidanceFiles?: string[];
}

/**
 * Configuration with all required values (defaults filled in).
 */
export interface PlannerConfigResolved {
  exploreModel: string | undefined;
  planningModel: string | undefined;
  exploreTools: string[];
  outputPath: string;
  guidanceFiles: string[];
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: PlannerConfigResolved = {
  exploreModel: undefined,
  planningModel: undefined,
  exploreTools: ["read", "bash", "grep", "find", "ls"],
  outputPath: "PLAN.md",
  guidanceFiles: [
    "AGENTS.md",
    "CLAUDE.md",
    ".github/copilot-instructions.md",
    "PLAN.md",
  ],
};

/**
 * TypeBox schema for the explore tool parameters.
 */
export const ExploreParamsSchema = Type.Object({
  task: Type.String({
    description:
      "What to explore — be specific about what files, patterns, or architecture to investigate",
  }),
});

/**
 * Result from the explore tool.
 */
export interface ExploreResult {
  success: boolean;
  output: string;
  truncated?: boolean;
  error?: string;
}

/**
 * Global config file path.
 */
export const GLOBAL_CONFIG_PATH = "~/.pi/planner.json";

/**
 * Project config file path (relative to project root).
 */
export const PROJECT_CONFIG_PATH = ".pi/planner.json";

/**
 * Global planning context file path.
 */
export const GLOBAL_PLANNING_CONTEXT_PATH = "~/.pi/planning.md";

/**
 * Project planning context file path (relative to project root).
 */
export const PROJECT_PLANNING_CONTEXT_PATH = ".pi/planning.md";
