import { describe, expect, it } from "vitest";

import { consumeFromOldestLots } from "@/lib/services/supply";
import type { ExpiryInfo } from "@/types";

describe("consumeFromOldestLots", () => {
  it("consumes from the oldest expiry date first (FIFO)", () => {
    const lots: ExpiryInfo[] = [
      { date: "2026-06-01", quantity: 5, addedAt: "2026-01-01" },
      { date: "2026-03-01", quantity: 3, addedAt: "2026-01-01" },
      { date: "2026-09-01", quantity: 10, addedAt: "2026-01-01" },
    ];

    const result = consumeFromOldestLots(lots, 4);

    expect(result.consumedFrom).toEqual([
      { date: "2026-03-01", quantity: 3 },
      { date: "2026-06-01", quantity: 1 },
    ]);
    expect(result.updatedLots).toEqual([
      { date: "2026-06-01", quantity: 4, addedAt: "2026-01-01" },
      { date: "2026-09-01", quantity: 10, addedAt: "2026-01-01" },
    ]);
    expect(result.remainingToConsume).toBe(0);
  });

  it("removes empty lots after full consumption of a lot", () => {
    const lots: ExpiryInfo[] = [
      { date: "2026-01-01", quantity: 2, addedAt: "2025-12-01" },
      { date: "2026-02-01", quantity: 5, addedAt: "2025-12-01" },
    ];

    const result = consumeFromOldestLots(lots, 2);

    expect(result.updatedLots).toEqual([
      { date: "2026-02-01", quantity: 5, addedAt: "2025-12-01" },
    ]);
    expect(result.remainingToConsume).toBe(0);
  });

  it("reports remaining when stock is insufficient", () => {
    const lots: ExpiryInfo[] = [
      { date: "2026-01-01", quantity: 1, addedAt: "2025-12-01" },
    ];

    const result = consumeFromOldestLots(lots, 5);

    expect(result.updatedLots).toEqual([]);
    expect(result.consumedFrom).toEqual([{ date: "2026-01-01", quantity: 1 }]);
    expect(result.remainingToConsume).toBe(4);
  });

  it("does not mutate the input lots array", () => {
    const lots: ExpiryInfo[] = [
      { date: "2026-01-01", quantity: 3, addedAt: "2025-12-01" },
    ];
    const original = structuredClone(lots);

    consumeFromOldestLots(lots, 1);

    expect(lots).toEqual(original);
  });
});
