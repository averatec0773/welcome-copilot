import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPrompt, SUGGESTED_QUESTIONS } from "@/lib/claude";
import prebaked from "@/content/prebaked.json";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildPrompt", () => {
  it("numbers excerpts and appends the question", () => {
    const p = buildPrompt("How do I reset my password?", [
      { id: 0, docTitle: "EHR Access", category: "IT", section: "Password resets", text: "Use the self-service link." },
    ]);
    expect(p).toContain("[1] EHR Access — Password resets");
    expect(p).toContain("Use the self-service link.");
    expect(p.trim().endsWith("How do I reset my password?")).toBe(true);
  });
});

describe("SUGGESTED_QUESTIONS", () => {
  it("has exactly 4 entries", () => {
    expect(SUGGESTED_QUESTIONS).toHaveLength(4);
  });
});

describe("prebaked.json", () => {
  it("has exactly one entry per suggested question, kept in sync", () => {
    expect(Object.keys(prebaked).sort()).toEqual([...SUGGESTED_QUESTIONS].sort());
  });
});

describe("access", () => {
  it("accepts the right code, rejects wrong ones, round-trips the cookie token", async () => {
    vi.stubEnv("DEMO_ACCESS_CODE", "test-code");
    const { verifyCode, accessToken, hasAccess } = await import("@/lib/access");
    expect(verifyCode("test-code")).toBe(true);
    expect(verifyCode("wrong")).toBe(false);
    expect(verifyCode("")).toBe(false);
    expect(hasAccess(accessToken())).toBe(true);
    expect(hasAccess("forged")).toBe(false);
    expect(hasAccess(undefined)).toBe(false);
  });

  it("fails closed when DEMO_ACCESS_CODE is unset or whitespace-only", async () => {
    const { verifyCode, hasAccess } = await import("@/lib/access");
    for (const value of ["", "   "]) {
      vi.stubEnv("DEMO_ACCESS_CODE", value);
      expect(verifyCode("anything")).toBe(false);
      expect(hasAccess("anything")).toBe(false);
    }
  });
});
