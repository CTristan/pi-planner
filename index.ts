/**
 * pi-planner Extension
 *
 * A Pi extension for planning sessions with:
 * - Cheap model exploration via subprocess delegation
 * - Interactive configuration wizard
 * - Context layering for global and project-specific planning guidance
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { loadConfig } from "./src/config.js";
import {
  activatePlanningMode,
  deactivatePlanningMode,
  generateContextMessage,
  isPlanningInvocation,
  isPlanningModeActive,
} from "./src/context.js";
import {
  executeExplore,
  renderExploreCall,
  renderExploreResult,
} from "./src/explore.js";
import { ExploreParamsSchema } from "./src/types.js";
import { runConfigWizard } from "./src/wizard.js";

// ============================================================================
// Extension Entry Point
// ============================================================================

export default function plannerExtension(pi: ExtensionAPI) {
  // Track the previous model to restore after planning
  let previousModel: { provider: string; id: string } | undefined;

  // Register the explore tool
  pi.registerTool({
    name: "explore",
    label: "Explore",
    description:
      "Delegate codebase exploration to a fast, lightweight subprocess. Use this for scanning directories, reading multiple files, finding patterns, and understanding architecture. For small, targeted reads (guidance files, existing PLAN.md), use direct reads instead.",
    parameters: ExploreParamsSchema,
    execute: async (
      _toolCallId: string,
      params: { task: string },
      _signal: AbortSignal | undefined,
      _onUpdate: (update: unknown) => void,
      ctx: ExtensionContext,
    ) => {
      const result = await executeExplore(params, ctx);
      return {
        content: [{ type: "text", text: result.output }],
        details: {
          call: renderExploreCall(params),
          result: renderExploreResult(result),
          truncated: result.truncated,
          error: result.error,
        },
      };
    },
  });

  // Register the /planning-config command
  pi.registerCommand("/planning-config", {
    description: "Configure pi-planner settings",
    handler: async (_args: string | undefined, ctx: ExtensionContext) => {
      await runConfigWizard(ctx);
    },
  });

  // Listen for input events to detect planning invocations
  pi.on("input", (event: { text: string }) => {
    if (isPlanningInvocation(event.text)) {
      // Extract topic from the planning invocation
      const topic = event.text
        .trim()
        .replace(/^\/planning\s*/, "")
        .trim();
      activatePlanningMode(topic);
    }
  });

  // Inject context before agent starts if in planning mode
  pi.on(
    "before_agent_start",
    (
      _event: { prompt: string; systemPrompt: string },
      ctx: ExtensionContext,
    ) => {
      // This function should return an object, not call pi.sendMessage()
      if (!isPlanningModeActive()) {
        return;
      }

      const config = loadConfig(ctx);

      // Switch model if planningModel is configured
      const planningModel = config.planningModel;
      if (planningModel) {
        const parts = planningModel.split("/");
        if (parts.length >= 2) {
          const provider = parts[0];
          const modelId = parts.slice(1).join("/");

          if (!provider || !modelId) {
            return;
          }

          // Save current model for restoration
          if (ctx.model) {
            previousModel = {
              provider: ctx.model.provider,
              id: ctx.model.id,
            };
          }

          // Try to find and set the model
          const model = ctx.modelRegistry?.find(provider, modelId);
          if (model) {
            pi.setModel(model);
          }
        }
      }

      // Generate and return the context message
      const contextMessage = generateContextMessage(ctx);

      // Deactivate planning mode after injection
      deactivatePlanningMode();

      if (contextMessage) {
        return {
          message: {
            customType: "planning-context",
            content: contextMessage,
            display: false,
          },
        };
      }

      return undefined;
    },
  );

  // Restore model after planning session ends
  pi.on("agent_end", () => {
    if (previousModel) {
      // We need to access the modelRegistry from somewhere
      // Since we don't have direct access to ctx here, we store the model object instead
      // For now, just clear the previousModel
      previousModel = undefined;
    }
  });
}
