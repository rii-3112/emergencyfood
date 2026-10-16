import { describe, expect, it } from "vitest";

import type { Supply, TeamStockSettings } from "@/types";

import {
  buildWeeklyDigestMessage,
  collectWeeklyDigestIssues,
  hasWeeklyDigestIssues,
} from "./lineWeeklyDigest";

const now = new Date("2026-10-13T00:00:00.000Z");

function supply(overrides: Partial<Supply> = {}): Supply {
  return {
    id: "supply-1",
    name: "米",
    quantity: 2,
    expiryDate: "2027-01-01",
    isArchived: false,
    category: "米・パン",
    unit: "kg",
    registeredAt: { seconds: 0, nanoseconds: 0 },
    teamId: "team-1",
    uid: "user-1",
    ...overrides,
  };
}

const adultOnly: TeamStockSettings = {
  householdSize: 1,
  stockDays: 3,
  hasPets: false,
  useDetailedComposition: true,
  composition: { adult: 1, child: 0, infant: 0, elderly: 0 },
};

describe("collectWeeklyDigestIssues", () => {
  it("returns no issues when stock and expiry are fine", () => {
    const issues = collectWeeklyDigestIssues(
      [supply({ quantity: 10, expiryDate: "2027-12-01" })],
      adultOnly,
      { criticalStock: true, expiryNear: true },
      now
    );

    expect(hasWeeklyDigestIssues(issues)).toBe(false);
  });

  it("detects out of stock and skips expiry for quantity 0", () => {
    const issues = collectWeeklyDigestIssues(
      [
        supply({
          id: "empty",
          name: "水",
          quantity: 0,
          expiryDate: "2026-09-01",
          category: "飲料",
          unit: "L",
        }),
      ],
      adultOnly,
      { criticalStock: true, expiryNear: true },
      now
    );

    expect(issues.out).toHaveLength(1);
    expect(issues.out[0]?.name).toBe("水");
    expect(issues.expired).toHaveLength(0);
    expect(issues.near).toHaveLength(0);
  });

  it("detects expired and near-expiry lots", () => {
    const issues = collectWeeklyDigestIssues(
      [
        supply({
          id: "expired",
          name: "乾パン",
          quantity: 2,
          expiryDate: "2026-09-01",
          category: "米・パン",
        }),
        supply({
          id: "near",
          name: "アルファ米",
          quantity: 2,
          expiryDate: "2026-10-20",
          category: "米・パン",
        }),
        supply({
          id: "later",
          name: "缶詰",
          quantity: 2,
          expiryDate: "2027-01-01",
          category: "缶詰",
        }),
      ],
      adultOnly,
      { criticalStock: true, expiryNear: true },
      now
    );

    expect(issues.expired.map((item) => item.name)).toEqual(["乾パン"]);
    expect(issues.near.map((item) => item.name)).toEqual(["アルファ米"]);
  });

  it("respects notification toggles", () => {
    const supplies = [
      supply({
        id: "empty",
        name: "水",
        quantity: 0,
        category: "飲料",
        unit: "L",
      }),
      supply({
        id: "expired",
        name: "乾パン",
        quantity: 2,
        expiryDate: "2026-09-01",
        category: "米・パン",
      }),
    ];

    const stockOnly = collectWeeklyDigestIssues(
      supplies,
      adultOnly,
      { criticalStock: true, expiryNear: false },
      now
    );
    expect(stockOnly.out).toHaveLength(1);
    expect(stockOnly.expired).toHaveLength(0);

    const expiryOnly = collectWeeklyDigestIssues(
      supplies,
      adultOnly,
      { criticalStock: false, expiryNear: true },
      now
    );
    expect(expiryOnly.out).toHaveLength(0);
    expect(expiryOnly.expired).toHaveLength(1);
  });

  it("ignores noExpiry categories and archived supplies", () => {
    const issues = collectWeeklyDigestIssues(
      [
        supply({
          id: "other",
          name: "軍手",
          quantity: 2,
          expiryDate: "2026-10-01",
          category: "その他",
        }),
        supply({
          id: "archived",
          name: "古い米",
          quantity: 0,
          isArchived: true,
          category: "米・パン",
        }),
      ],
      adultOnly,
      { criticalStock: true, expiryNear: true },
      now
    );

    expect(hasWeeklyDigestIssues(issues)).toBe(false);
  });
});

describe("buildWeeklyDigestMessage", () => {
  it("builds a weekly digest with summary and capped action items", () => {
    const message = buildWeeklyDigestMessage({
      teamName: "山田家",
      appUrl: "https://example.com/",
      maxItems: 2,
      issues: {
        out: [
          {
            id: "1",
            name: "水",
            kind: "out",
            priority: 0,
            detail: "在庫切れ",
          },
        ],
        critical: [],
        expired: [
          {
            id: "2",
            name: "乾パン",
            kind: "expired",
            priority: 2,
            detail: "賞味期限切れ",
          },
        ],
        near: [
          {
            id: "3",
            name: "アルファ米",
            kind: "near",
            priority: 3,
            detail: "賞味期限 残り5日",
            remainingDays: 5,
          },
          {
            id: "4",
            name: "缶詰",
            kind: "near",
            priority: 3,
            detail: "賞味期限 残り10日",
            remainingDays: 10,
          },
        ],
      },
    });

    expect(message).toContain("【SonaBase 今週の備えメモ】");
    expect(message).toContain("グループ: 山田家");
    expect(message).toContain("・在庫切れ: 1件");
    expect(message).toContain("・期限切れ: 1件");
    expect(message).toContain("・期限接近: 2件");
    expect(message).toContain("• 水（在庫切れ）");
    expect(message).toContain("• 乾パン（賞味期限切れ）");
    expect(message).toContain("... 他2件");
    expect(message).not.toContain("アルファ米");
    expect(message).toContain("https://example.com/supplies/list");
  });
});
