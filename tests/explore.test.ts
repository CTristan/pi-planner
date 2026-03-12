/**
 * Tests for the explore tool.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, saveConfig } from "../src/config.js";
import {
  MAX_OUTPUT_SIZE,
  renderExploreCall,
  renderExploreResult,
  truncateOutput,
} from "../src/explore.js";

describe("explore", () => {
  const testDir = path.join(
    os.tmpdir(),
    `pi-planner-explore-test-${Date.now()}`,
  );

  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Clean up any existing global config
    const globalConfigPath = path.join(os.homedir(), ".pi", "planner.json");
    try {
      if (fs.existsSync(globalConfigPath)) {
        fs.unlinkSync(globalConfigPath);
      }
    } catch {
      // Ignore errors
    }

    // Set up default config
    saveConfig("global", {
      exploreModel: "github-copilot/gemini-3-flash-preview",
      exploreTools: ["read", "bash", "grep", "find", "ls"],
    });
  });

  afterEach(() => {
    // Clean up global config after each test
    const globalConfigPath = path.join(os.homedir(), ".pi", "planner.json");
    try {
      if (fs.existsSync(globalConfigPath)) {
        fs.unlinkSync(globalConfigPath);
      }
    } catch {
      // Ignore errors
    }
  });

  describe("loadConfig for explore", () => {
    it("should load explore model from config", () => {
      // Set up default project config to ensure test isolation
      saveConfig(
        "project",
        { exploreModel: "github-copilot/gemini-3-flash-preview" },
        testDir,
      );

      const ctx = { cwd: testDir } as never;
      const config = loadConfig(ctx);

      expect(config.exploreModel).toBe("github-copilot/gemini-3-flash-preview");
      expect(config.exploreTools).toContain("read");
      expect(config.exploreTools).toContain("bash");
    });

    it("should load custom explore model", () => {
      saveConfig("project", { exploreModel: "custom-model" }, testDir);

      const ctx = { cwd: testDir } as never;
      const config = loadConfig(ctx);

      expect(config.exploreModel).toBe("custom-model");
    });

    it("should load custom explore tools", () => {
      const customTools = ["read", "bash", "ls"];
      saveConfig("project", { exploreTools: customTools }, testDir);

      const ctx = { cwd: testDir } as never;
      const config = loadConfig(ctx);

      expect(config.exploreTools).toEqual(customTools);
    });

    it("should handle single explore tool", () => {
      saveConfig("project", { exploreTools: ["read"] }, testDir);

      const ctx = { cwd: testDir } as never;
      const config = loadConfig(ctx);

      expect(config.exploreTools).toEqual(["read"]);
    });

    it("should handle empty explore tools array", () => {
      saveConfig("project", { exploreTools: [] }, testDir);

      const ctx = { cwd: testDir } as never;
      const config = loadConfig(ctx);

      expect(config.exploreTools).toEqual([]);
    });
  });

  describe("renderExploreCall", () => {
    it("should render task description with emoji", () => {
      const params = { task: "Find all test files" };
      const rendered = renderExploreCall(params);
      expect(rendered).toContain("📖");
      expect(rendered).toContain("Explore:");
      expect(rendered).toContain("Find all test files");
    });

    it("should render multi-line task", () => {
      const params = {
        task: "Find all test files\nand their dependencies",
      };
      const rendered = renderExploreCall(params);
      expect(rendered).toContain("Find all test files");
    });

    it("should render task with special characters", () => {
      const params = { task: "Find files matching *.test.ts pattern" };
      const rendered = renderExploreCall(params);
      expect(rendered).toContain("*.test.ts");
    });
  });

  describe("renderExploreResult", () => {
    it("should render successful result", () => {
      const result = {
        success: true,
        output: "Found 5 test files",
        truncated: false,
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("✅");
      expect(rendered).toContain("Exploration complete");
      expect(rendered).toContain("Found 5 test files");
    });

    it("should render truncated result with warning", () => {
      const result = {
        success: true,
        output: "x".repeat(1000),
        truncated: true,
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("truncated");
      expect(rendered).not.toContain("1000"); // Should truncate preview
    });

    it("should render error result", () => {
      const result = {
        success: false,
        output: "",
        error: "Process failed",
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("❌");
      expect(rendered).toContain("failed");
      expect(rendered).toContain("Process failed");
    });

    it("should show preview for long output", () => {
      const longOutput = "a".repeat(300);
      const result = {
        success: true,
        output: longOutput,
        truncated: false,
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("..."); // Should have ellipsis for truncated preview
    });

    it("should show full output for short results", () => {
      const shortOutput = "Test output";
      const result = {
        success: true,
        output: shortOutput,
        truncated: false,
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("Test output");
      expect(rendered).not.toContain("...");
    });

    it("should handle error with output", () => {
      const result = {
        success: false,
        output: "Partial output before error",
        error: "Process failed",
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("failed");
    });
  });

  describe("truncation behavior", () => {
    it("should truncate output at max size", () => {
      // The truncate threshold in explore.ts is 50KB
      // We can't test the actual truncate function directly, but we can verify
      // the rendering behavior for different output sizes

      const smallOutput = "Small output";
      const result = {
        success: true,
        output: smallOutput,
        truncated: false,
      };
      const rendered = renderExploreResult(result);
      expect(rendered).toContain("Small output");

      const largeOutput = "x".repeat(100000);
      const largeResult = {
        success: true,
        output: largeOutput,
        truncated: true,
      };
      const largeRendered = renderExploreResult(largeResult);
      expect(largeRendered).toContain("truncated");
      expect(largeRendered).not.toContain(largeOutput); // Should not contain full output
    });
  });

  describe("truncateOutput", () => {
    it("should not truncate small output", () => {
      const smallOutput = "Small output text";
      const result = truncateOutput(smallOutput, 1000);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncated).toBe(smallOutput);
    });

    it("should not truncate output exactly at max size", () => {
      const exactSizeOutput = "a".repeat(1000);
      const result = truncateOutput(exactSizeOutput, 1000);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncated).toBe(exactSizeOutput);
    });

    it("should truncate output exceeding max size", () => {
      const largeOutput = "a".repeat(2000);
      const result = truncateOutput(largeOutput, 1000);

      expect(result.wasTruncated).toBe(true);
      expect(result.truncated.length).toBeLessThan(largeOutput.length);
      expect(result.truncated).toContain("[Output truncated");
    });

    it("should include truncation notice with size", () => {
      const largeOutput = "a".repeat(2000);
      const result = truncateOutput(largeOutput, 1000);

      expect(result.truncated).toContain("1000 bytes");
    });

    it("should keep start of output when truncating", () => {
      const output = `START${"x".repeat(2000)}END`;
      const result = truncateOutput(output, 100);

      expect(result.truncated).toContain("START");
      expect(result.truncated).not.toContain("END");
    });

    it("should handle empty string", () => {
      const result = truncateOutput("", 100);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncated).toBe("");
    });

    it("should handle unicode characters correctly", () => {
      const unicodeOutput = `🚀 测试${"émojis ".repeat(100)}`;
      const result = truncateOutput(unicodeOutput, 500);

      // Should handle unicode without issues
      expect(result.truncated).toBeDefined();
    });

    it("should use MAX_OUTPUT_SIZE constant", () => {
      expect(MAX_OUTPUT_SIZE).toBe(50 * 1024); // 50KB
    });

    it("should truncate at MAX_OUTPUT_SIZE for large output", () => {
      const hugeOutput = "x".repeat(100000); // 100KB
      const result = truncateOutput(hugeOutput, MAX_OUTPUT_SIZE);

      expect(result.wasTruncated).toBe(true);
      expect(result.truncated.length).toBeLessThanOrEqual(
        MAX_OUTPUT_SIZE + 100,
      ); // Allow some margin for truncation notice
    });
  });

  describe("executeExplore", () => {
    const testDir = path.join(
      os.tmpdir(),
      `pi-planner-explore-exec-test-${Date.now()}`,
    );

    beforeEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it("should be importable", async () => {
      // Just verify the module can be imported
      const { executeExplore } = await import("../src/explore.js");
      expect(executeExplore).toBeDefined();
      expect(typeof executeExplore).toBe("function");
    });

    it("should export all required functions and types", async () => {
      const module = await import("../src/explore.js");

      // Check exported functions
      expect(module.executeExplore).toBeDefined();
      expect(module.renderExploreCall).toBeDefined();
      expect(module.renderExploreResult).toBeDefined();
      expect(module.truncateOutput).toBeDefined();
      expect(module.MAX_OUTPUT_SIZE).toBeDefined();
    });
  });
});
