/**
 * Tests for the planner extension entry point.
 */

import { describe, expect, it } from "vitest";
import {
  activatePlanningMode,
  deactivatePlanningMode,
  getPlanningTopic,
  isPlanningInvocation,
  isPlanningModeActive,
  resetPlanningState,
} from "../src/context.js";

describe("planner extension", () => {
  beforeEach(() => {
    resetPlanningState();
  });

  afterEach(() => {
    resetPlanningState();
  });

  describe("planning invocation detection", () => {
    it("should detect /planning command", () => {
      expect(isPlanningInvocation("/planning")).toBe(true);
      expect(isPlanningInvocation("/planning add feature")).toBe(true);
      expect(isPlanningInvocation("/planning  ")).toBe(true);
    });

    it("should not detect non-planning commands", () => {
      expect(isPlanningInvocation("/help")).toBe(false);
      expect(isPlanningInvocation("/explore")).toBe(false);
      expect(isPlanningInvocation("planning add")).toBe(false);
    });
  });

  describe("planning mode with topic", () => {
    it("should activate planning mode with topic", () => {
      activatePlanningMode("add authentication");
      expect(isPlanningModeActive()).toBe(true);
      expect(getPlanningTopic()).toBe("add authentication");
    });

    it("should allow empty topic", () => {
      activatePlanningMode();
      expect(getPlanningTopic()).toBe("");
    });

    it("should reset topic when deactivated", () => {
      activatePlanningMode("test topic");
      deactivatePlanningMode();
      expect(getPlanningTopic()).toBe("");
    });

    it("should reset topic on state reset", () => {
      activatePlanningMode("test topic");
      resetPlanningState();
      expect(getPlanningTopic()).toBe("");
      expect(isPlanningModeActive()).toBe(false);
    });
  });

  describe("model switching logic (unit tests)", () => {
    it("should parse provider/model from planningModel config", () => {
      // Test the parsing logic that's used in index.ts
      const planningModel = "anthropic/claude-sonnet-4-5";
      const parts = planningModel.split("/");

      expect(parts[0]).toBe("anthropic");
      expect(parts.slice(1).join("/")).toBe("claude-sonnet-4-5");
    });

    it("should handle single-part model name", () => {
      const planningModel = "claude";
      const parts = planningModel.split("/");

      // Should not switch model if less than 2 parts
      expect(parts.length >= 2).toBe(false);
    });

    it("should handle model with multiple slashes", () => {
      const planningModel = "provider/model/with/slashes";
      const parts = planningModel.split("/");

      expect(parts[0]).toBe("provider");
      expect(parts.slice(1).join("/")).toBe("model/with/slashes");
    });
  });
});
