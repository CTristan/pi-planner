/**
 * Tests for context layering functionality.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveConfig } from "../src/config.js";
import {
  activatePlanningMode,
  deactivatePlanningMode,
  generateContextMessage,
  getPlanningTopic,
  isPlanningInvocation,
  isPlanningModeActive,
  loadPlanningContext,
  resetPlanningState,
} from "../src/context.js";

describe("context", () => {
  const testDir = path.join(
    os.tmpdir(),
    `pi-planner-context-test-${Date.now()}`,
  );
  const globalContextDir = path.join(os.tmpdir(), "pi-global-test");

  beforeEach(() => {
    // Clean up test directories before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(globalContextDir)) {
      fs.rmSync(globalContextDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(globalContextDir, { recursive: true });

    // Reset planning state
    resetPlanningState();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(globalContextDir)) {
      fs.rmSync(globalContextDir, { recursive: true, force: true });
    }
    resetPlanningState();
  });

  describe("loadPlanningContext", () => {
    it("should return empty string when no context files exist", () => {
      const context = loadPlanningContext(testDir);
      expect(context).toBe("");
    });

    it("should load only project context when global context doesn't exist", () => {
      // Create project context file
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      fs.writeFileSync(projectPath, "Project-specific context here", "utf-8");

      const context = loadPlanningContext(testDir);

      expect(context).toContain("### Project Planning Context");
      expect(context).toContain("Project-specific context here");
      expect(context).not.toContain("### Global Planning Context");
    });

    it("should skip empty project context files", () => {
      // Create empty project context file
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      fs.writeFileSync(projectPath, "", "utf-8");

      const context = loadPlanningContext(testDir);

      // Empty files should be skipped, not included
      expect(context).not.toContain("### Project Planning Context");
    });

    it("should handle whitespace-only context files", () => {
      // Create whitespace-only project context file
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      fs.writeFileSync(projectPath, "   \n\n  \t  \n", "utf-8");

      const context = loadPlanningContext(testDir);

      // Whitespace-only files should be skipped
      expect(context).not.toContain("### Project Planning Context");
    });

    it("should load multi-line project context", () => {
      // Create multi-line project context file
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      const multiLineContent =
        "# Project Planning Guide\n\n## Conventions\n- Use TypeScript\n- Write tests first\n\n## Architecture\nFollow hexagonal architecture.";
      fs.writeFileSync(projectPath, multiLineContent, "utf-8");

      const context = loadPlanningContext(testDir);

      expect(context).toContain("### Project Planning Context");
      expect(context).toContain("# Project Planning Guide");
      expect(context).toContain("## Conventions");
      expect(context).toContain("## Architecture");
    });

    it("should handle file read errors gracefully", () => {
      // Create a directory instead of a file (simulating error)
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      fs.mkdirSync(projectPath); // Create as directory instead of file

      const context = loadPlanningContext(testDir);

      // Should handle error gracefully and return empty or partial context
      expect(context).toBeDefined();
    });
  });

  describe("isPlanningInvocation", () => {
    it("should detect planning invocation", () => {
      expect(isPlanningInvocation("/planning add feature")).toBe(true);
      expect(isPlanningInvocation("/planning")).toBe(true);
      expect(isPlanningInvocation("   /planning test   ")).toBe(true);
    });

    it("should not detect non-planning invocations", () => {
      expect(isPlanningInvocation("/help")).toBe(false);
      expect(isPlanningInvocation("/plan-config")).toBe(false);
      expect(isPlanningInvocation("planning add feature")).toBe(false);
      expect(isPlanningInvocation("")).toBe(false);
    });
  });

  describe("generateContextMessage", () => {
    it("should generate message with configuration", () => {
      saveConfig("project", { outputPath: "custom-plan.md" }, testDir);

      const ctx = { cwd: testDir } as unknown as ExtensionContext;
      const message = generateContextMessage(ctx);

      expect(message).not.toBeNull();
      expect(message).toContain("### Planning Configuration");
      expect(message).toContain("Output path:");
    });

    it("should include planning context if available", () => {
      // Create project context file
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      fs.writeFileSync(projectPath, "Custom project context", "utf-8");

      const ctx = { cwd: testDir } as unknown as ExtensionContext;
      const message = generateContextMessage(ctx);

      expect(message).toContain("### Project Planning Context");
      expect(message).toContain("Custom project context");
    });

    it("should always include configuration even when context files are empty", () => {
      // Create empty project context file
      const projectContextDir = path.join(testDir, ".pi");
      fs.mkdirSync(projectContextDir, { recursive: true });
      const projectPath = path.join(projectContextDir, "planning.md");
      fs.writeFileSync(projectPath, "", "utf-8");

      const ctx = { cwd: testDir } as unknown as ExtensionContext;
      const message = generateContextMessage(ctx);

      // Should still have configuration
      expect(message).not.toBeNull();
      expect(message).toContain("### Planning Configuration");
    });

    it("should format guidance files list correctly", () => {
      saveConfig(
        "project",
        { guidanceFiles: ["AGENTS.md", "README.md", "CONTRIBUTING.md"] },
        testDir,
      );

      const ctx = { cwd: testDir } as unknown as ExtensionContext;
      const message = generateContextMessage(ctx);

      expect(message).toContain("AGENTS.md, README.md, CONTRIBUTING.md");
    });

    it("should handle empty guidance files array", () => {
      saveConfig("project", { guidanceFiles: [] }, testDir);

      const ctx = { cwd: testDir } as unknown as ExtensionContext;
      const message = generateContextMessage(ctx);

      expect(message).toContain("Guidance files to check: ");
    });
  });

  describe("planning state management", () => {
    it("should track planning mode activation", () => {
      expect(isPlanningModeActive()).toBe(false);

      activatePlanningMode();
      expect(isPlanningModeActive()).toBe(true);

      deactivatePlanningMode();
      expect(isPlanningModeActive()).toBe(false);
    });

    it("should reset planning state", () => {
      activatePlanningMode();
      expect(isPlanningModeActive()).toBe(true);

      resetPlanningState();
      expect(isPlanningModeActive()).toBe(false);
    });

    it("should store topic when activating planning mode", () => {
      expect(getPlanningTopic()).toBe("");

      activatePlanningMode("add authentication");
      expect(getPlanningTopic()).toBe("add authentication");

      deactivatePlanningMode();
      expect(getPlanningTopic()).toBe("");
    });

    it("should allow empty topic", () => {
      activatePlanningMode();
      expect(getPlanningTopic()).toBe("");
    });

    it("should reset topic on state reset", () => {
      activatePlanningMode("test topic");
      expect(getPlanningTopic()).toBe("test topic");

      resetPlanningState();
      expect(getPlanningTopic()).toBe("");
    });
  });
});
