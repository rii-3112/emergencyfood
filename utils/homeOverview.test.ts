import { describe, expect, it } from "vitest";

import type { Supply, TeamStockSettings } from "@/types";
import type { DisasterBoardData } from "@/types/forms";

import {
  isFamilyPrepared,
  summarizeChecklist,
  summarizePlans,
  summarizeSupplies,
  supplyMatchesFocus,
} from "./homeOverview";

const now = new Date("2026-09-29T00:00:00.000Z");

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

describe("summarizeSupplies", () => {
  it("counts near-expiry food inside 30 days and expired lots separately", () => {
    const summary = summarizeSupplies(
      [
        supply({ id: "near", expiryDate: "2026-10-10" }),
        supply({ id: "expired", expiryDate: "2026-09-01" }),
        supply({ id: "later", expiryDate: "2026-12-01" }),
        supply({ id: "other", category: "その他", expiryDate: "2026-10-01" }),
        supply({ id: "empty", quantity: 0, expiryDate: "2026-10-01" }),
      ],
      adultOnly,
      null,
      now
    );

    expect(summary.total).toBe(5);
    expect(summary.nearExpiry).toBe(1);
    expect(summary.expired).toBe(1);
    expect(summary.out).toBe(1);

    const items = [
      supply({ id: "near", expiryDate: "2026-10-10" }),
      supply({ id: "expired", expiryDate: "2026-09-01" }),
      supply({ id: "later", expiryDate: "2026-12-01" }),
      supply({ id: "other", category: "その他", expiryDate: "2026-10-01" }),
      supply({ id: "empty", quantity: 0, expiryDate: "2026-10-01" }),
    ];
    expect(
      items.filter((item) => supplyMatchesFocus(item, "near", adultOnly, now))
    ).toHaveLength(summary.nearExpiry);
    expect(
      items.filter((item) =>
        supplyMatchesFocus(item, "expired", adultOnly, now)
      )
    ).toHaveLength(summary.expired);
    expect(
      items.filter((item) => supplyMatchesFocus(item, "out", adultOnly, now))
    ).toHaveLength(summary.out);
  });
});

describe("summarizeChecklist", () => {
  it("counts household and adult items for a one-adult household", () => {
    const summary = summarizeChecklist(adultOnly, {
      checkedItemIds: ["adult-water", "household-stove", "child-food"],
      checkedPetItems: {},
    });

    expect(summary.total).toBe(18);
    expect(summary.checked).toBe(2);
  });

  it("adds pet items only when the household has pets", () => {
    const summary = summarizeChecklist(
      {
        ...adultOnly,
        hasPets: true,
        dogCount: 1,
        catCount: 0,
      },
      {
        checkedItemIds: [],
        checkedPetItems: { dog: ["dog-food", "dog-toy"] },
      }
    );

    expect(summary.total).toBe(23);
    expect(summary.checked).toBe(2);
  });
});

describe("summarizePlans", () => {
  it("counts saved family decisions and treats missing data as empty", () => {
    const data: DisasterBoardData = {
      evacuationSites: [
        {
          disasterType: "earthquake",
          name: "小学校",
          address: "1-1",
        },
      ],
      evacuationRoutes: [],
      safetyMethods: [{ method: "LINE", contact: "家族グループ", priority: 1 }],
      familyAgreements: [],
      useDisasterDial: true,
    };

    expect(summarizePlans(data)).toEqual({
      evacuationSites: 1,
      evacuationRoutes: 0,
      safetyMethods: 1,
      familyAgreements: 0,
    });
    expect(summarizePlans(null).evacuationSites).toBe(0);
  });
});

describe("isFamilyPrepared", () => {
  const readySupplies = {
    total: 2,
    out: 0,
    short: 0,
    nearExpiry: 0,
    expired: 0,
    overallPercentage: 100,
  };
  const readyPlans = {
    evacuationSites: 1,
    evacuationRoutes: 1,
    safetyMethods: 1,
    familyAgreements: 1,
  };

  it("is ready only when stock exists and every gap is closed", () => {
    expect(isFamilyPrepared(readySupplies, readyPlans)).toBe(true);
    expect(isFamilyPrepared({ ...readySupplies, total: 0 }, readyPlans)).toBe(
      false
    );
    expect(isFamilyPrepared({ ...readySupplies, out: 1 }, readyPlans)).toBe(
      false
    );
    expect(
      isFamilyPrepared(readySupplies, { ...readyPlans, evacuationRoutes: 0 })
    ).toBe(false);
  });
});
