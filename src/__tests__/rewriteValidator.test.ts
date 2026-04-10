import { describe, expect, it } from "vitest";

import { isNoOpRewrite, validateRewriteRequest } from "../../api/v4/rewrite/rewriteValidator";

describe("rewriteValidator", () => {
  it("fails when original is missing", () => {
    const result = validateRewriteRequest({
      original: "",
      appliedSuggestions: ["clarify"],
      actionableSuggestions: ["clarify"],
      profileApplied: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing original text.");
  });

  it("fails when no actionable suggestions", () => {
    const result = validateRewriteRequest({
      original: "Some text",
      appliedSuggestions: ["review with students"],
      actionableSuggestions: [],
      profileApplied: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No actionable suggestions selected.");
  });

  it("fails when selected suggestions include non-actionable entries", () => {
    const result = validateRewriteRequest({
      original: "Some text",
      appliedSuggestions: ["clarify", "review in class"],
      actionableSuggestions: ["clarify"],
      profileApplied: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Some selected suggestions are not actionable.");
  });

  it("passes with valid inputs", () => {
    const result = validateRewriteRequest({
      original: "Some text",
      appliedSuggestions: ["clarify"],
      actionableSuggestions: ["clarify"],
      profileApplied: "ELL",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("detects no-op rewrites", () => {
    expect(isNoOpRewrite("Find and interpret percentile", "Find and interpret percentile")).toBe(true);
    expect(isNoOpRewrite("Find and interpret percentile", "Find and interpret the percentile")).toBe(false);
  });
});
