/**
 * Explore tool for pi-planner - spawns cheap model subprocesses for codebase exploration.
 */

import { spawn } from "node:child_process";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { loadConfig } from "./config.js";
import type { ExploreResult } from "./types.js";

/**
 * Maximum output size before truncation (50KB).
 */
export const MAX_OUTPUT_SIZE = 50 * 1024;

/**
 * Truncates output to maximum size, preferring the start.
 */
export function truncateOutput(
  output: string,
  maxSize: number,
): {
  truncated: string;
  wasTruncated: boolean;
} {
  if (output.length <= maxSize) {
    return { truncated: output, wasTruncated: false };
  }

  // Keep the start of the output, add truncation notice
  const truncated = output.slice(0, maxSize);
  return {
    truncated: `${truncated}\n\n[Output truncated - exceeded ${maxSize} bytes]`,
    wasTruncated: true,
  };
}

/**
 * Executes the explore tool - spawns a cheap model subprocess.
 */
export async function executeExplore(
  params: { task: string },
  ctx: ExtensionContext,
): Promise<ExploreResult> {
  const config = loadConfig(ctx);
  const { exploreModel, exploreTools } = config;
  const task = params.task;

  return new Promise((resolve) => {
    const args = [
      "--print",
      "--model",
      exploreModel,
      "--tools",
      exploreTools.join(","),
      "--no-session",
      task,
    ];

    let stdout = "";
    let stderr = "";
    let killed = false;

    const proc = spawn("pi", args, {
      cwd: ctx.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // Pass explicit model to avoid override by model-selector
        PI_EXPLICIT_MODEL: exploreModel,
      },
    });

    // Set up abort handler
    const cleanup = (): void => {
      if (!killed) {
        killed = true;
        proc.kill("SIGTERM");
      }
    };

    // Attach abort signal if available
    if (typeof AbortSignal !== "undefined") {
      // Note: ctx.signal would be passed from the tool execution context
      // This is a placeholder - actual signal handling depends on pi's API
    }

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      // Show progress via onUpdate if available
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (killed) {
        resolve({
          success: false,
          output: "",
          error: "Exploration was aborted.",
        });
        return;
      }

      if (code !== 0 && stderr) {
        resolve({
          success: false,
          output: "",
          error: `Exploration failed with exit code ${code}: ${stderr}`,
        });
        return;
      }

      // Truncate if necessary
      const { truncated, wasTruncated } = truncateOutput(
        stdout,
        MAX_OUTPUT_SIZE,
      );

      resolve({
        success: true,
        output: truncated,
        truncated: wasTruncated,
      });
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: "",
        error: `Failed to spawn exploration process: ${err.message}`,
      });
    });

    // Set a timeout (30 seconds)
    setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        output: stdout,
        error: "Exploration timed out after 30 seconds.",
      });
    }, 30000);
  });
}

/**
 * Renders the explore tool call for display.
 */
export function renderExploreCall(params: { task: string }): string {
  return `📖 Explore: ${params.task}`;
}

/**
 * Renders the explore tool result for display.
 */
export function renderExploreResult(result: ExploreResult): string {
  if (!result.success) {
    return `❌ Exploration failed: ${result.error}`;
  }

  const truncatedNote = result.truncated ? " (truncated)" : "";
  const preview = result.output.slice(0, 200);
  const hasMore = result.output.length > 200;

  return `✅ Exploration complete${truncatedNote}\n\n${preview}${hasMore ? "..." : ""}`;
}
