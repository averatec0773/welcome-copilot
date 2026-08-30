import { describe, expect, it } from "vitest";
import { chunkDoc, searchHandbook } from "@/lib/retrieval";

const RAW = `---
title: Test Doc
category: IT
updated: 2026-08-01
---

Intro paragraph before any section.

## Requesting access

Submit the form on the IT Hub.

## Password resets

Use the self-service reset link.
`;

describe("chunkDoc", () => {
  it("splits on ## and keeps intro as Overview", () => {
    const chunks = chunkDoc(RAW, "test-doc.md");
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({ docTitle: "Test Doc", section: "Overview", updated: "2026-08-01" });
    expect(chunks[1].section).toBe("Requesting access");
    expect(chunks[1].text).toContain("IT Hub");
  });
});

describe("searchHandbook (real handbook)", () => {
  it("finds EHR access for an access question", () => {
    const hits = searchHandbook("how do I get access to the EHR system?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.map((h) => h.docTitle).join(" ")).toMatch(/EHR/i);
  });
  it("returns at most k results", () => {
    expect(searchHandbook("PTO vacation days", 2).length).toBeLessThanOrEqual(2);
  });
});
