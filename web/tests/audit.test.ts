import { describe, expect, it } from "vitest";
import { truncateIp } from "@/lib/audit";

describe("truncateIp", () => {
  it("drops the last octet of an IPv4 address", () => {
    expect(truncateIp("203.0.113.42")).toBe("203.0.113.x");
  });

  it("keeps the first three groups of an IPv6 address", () => {
    expect(truncateIp("2001:db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:db8:85a3::x");
  });

  it("handles a compressed IPv6 address", () => {
    expect(truncateIp("::1")).toBe("::1::x");
  });

  it("falls back to 'unknown' for garbage input", () => {
    expect(truncateIp("not-an-ip")).toBe("unknown");
    expect(truncateIp("")).toBe("unknown");
    expect(truncateIp("unknown")).toBe("unknown");
  });
});
