import { describe, expect, it } from "vitest";
import { buildPrompt, SUGGESTED_QUESTIONS } from "@/lib/claude";

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

describe("access", () => {
  it("accepts the right code, rejects wrong ones, round-trips the cookie token", async () => {
    process.env.DEMO_ACCESS_CODE = "test-code";
    const { verifyCode, accessToken, hasAccess } = await import("@/lib/access");
    expect(verifyCode("test-code")).toBe(true);
    expect(verifyCode("wrong")).toBe(false);
    expect(verifyCode("")).toBe(false);
    expect(hasAccess(accessToken())).toBe(true);
    expect(hasAccess("forged")).toBe(false);
    expect(hasAccess(undefined)).toBe(false);
  });
});
