import { describe, expect, it } from "vitest";
import { calculateEdge, probabilityToFairOdds } from "@/lib/utils/math";

describe("value math", () => {
  it("computes fair odds from probability", () => {
    expect(probabilityToFairOdds(0.5)).toBe(2);
    expect(probabilityToFairOdds(0.4)).toBe(2.5);
  });

  it("computes edge from probability and market odds", () => {
    expect(calculateEdge(0.55, 2)).toBe(0.1);
  });
});
