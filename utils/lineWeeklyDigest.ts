import type { NotificationSettings, Supply, TeamStockSettings } from "@/types";
import { calculateStockStatus } from "@/utils/stockCalculator";
import { getExpiryType } from "@/utils/stockRecommendations";

const DAY_MS = 1000 * 60 * 60 * 24;
export const LINE_WEEKLY_DIGEST_COOLDOWN_MS = 6 * DAY_MS;
export const LINE_WEEKLY_DIGEST_MAX_ITEMS = 5;

export type DigestIssueKind = "out" | "critical" | "expired" | "near";

export interface DigestIssue {
  id: string;
  name: string;
  kind: DigestIssueKind;
  /** Smaller = higher priority in the action list */
  priority: number;
  detail: string;
  remainingDays?: number;
}

export interface WeeklyDigestIssues {
  out: DigestIssue[];
  critical: DigestIssue[];
  expired: DigestIssue[];
  near: DigestIssue[];
}

export interface BuildWeeklyDigestMessageParams {
  teamName: string;
  issues: WeeklyDigestIssues;
  appUrl: string;
  maxItems?: number;
}

function remainingDays(expiryDate: Date, now: Date): number {
  return Math.ceil((expiryDate.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Collect stock / expiry issues for the weekly LINE digest.
 * Quantity-0 items are stock-only (not duplicated under expiry).
 */
export function collectWeeklyDigestIssues(
  supplies: Supply[],
  stockSettings: TeamStockSettings | null | undefined,
  notifications: Pick<NotificationSettings, "criticalStock" | "expiryNear">,
  now: Date = new Date()
): WeeklyDigestIssues {
  const criticalOn = notifications.criticalStock !== false;
  const expiryOn = notifications.expiryNear !== false;

  const issues: WeeklyDigestIssues = {
    out: [],
    critical: [],
    expired: [],
    near: [],
  };

  for (const supply of supplies) {
    if (supply.isArchived) continue;

    if (criticalOn) {
      const stockStatus = calculateStockStatus(supply, stockSettings);
      if (stockStatus.status === "out") {
        issues.out.push({
          id: supply.id,
          name: supply.name,
          kind: "out",
          priority: 0,
          detail: "在庫切れ",
        });
        continue;
      }
      if (stockStatus.status === "critical") {
        issues.critical.push({
          id: supply.id,
          name: supply.name,
          kind: "critical",
          priority: 1,
          detail: "緊急（残り少）",
        });
      }
    }

    if (!expiryOn || supply.quantity <= 0 || !supply.expiryDate) continue;

    const expiryType = getExpiryType(supply.category);
    if (expiryType.type === "noExpiry" || expiryType.notificationDays <= 0) {
      continue;
    }

    const expiryDate = new Date(supply.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) continue;

    const days = remainingDays(expiryDate, now);
    const notifyUntil = new Date(
      now.getTime() + expiryType.notificationDays * DAY_MS
    );

    if (expiryDate.getTime() <= now.getTime()) {
      issues.expired.push({
        id: supply.id,
        name: supply.name,
        kind: "expired",
        priority: 2,
        detail: `${expiryType.label}切れ`,
        remainingDays: days,
      });
    } else if (expiryDate.getTime() <= notifyUntil.getTime()) {
      issues.near.push({
        id: supply.id,
        name: supply.name,
        kind: "near",
        priority: 3,
        detail: `${expiryType.label} 残り${days}日`,
        remainingDays: days,
      });
    }
  }

  issues.near.sort(
    (a, b) => (a.remainingDays ?? Number.MAX_SAFE_INTEGER) - (b.remainingDays ?? Number.MAX_SAFE_INTEGER)
  );

  return issues;
}

export function hasWeeklyDigestIssues(issues: WeeklyDigestIssues): boolean {
  return (
    issues.out.length > 0 ||
    issues.critical.length > 0 ||
    issues.expired.length > 0 ||
    issues.near.length > 0
  );
}

function actionItems(issues: WeeklyDigestIssues): DigestIssue[] {
  return [
    ...issues.out,
    ...issues.critical,
    ...issues.expired,
    ...issues.near,
  ];
}

export function buildWeeklyDigestMessage({
  teamName,
  issues,
  appUrl,
  maxItems = LINE_WEEKLY_DIGEST_MAX_ITEMS,
}: BuildWeeklyDigestMessageParams): string {
  const baseUrl = appUrl.replace(/\/$/, "");
  const lines: string[] = [
    "【SonaBase 今週の備えメモ】",
    `グループ: ${teamName}`,
    "",
    "サマリ",
  ];

  if (issues.out.length > 0) {
    lines.push(`・在庫切れ: ${issues.out.length}件`);
  }
  if (issues.critical.length > 0) {
    lines.push(`・緊急（残り少）: ${issues.critical.length}件`);
  }
  if (issues.expired.length > 0) {
    lines.push(`・期限切れ: ${issues.expired.length}件`);
  }
  if (issues.near.length > 0) {
    lines.push(`・期限接近: ${issues.near.length}件`);
  }

  const items = actionItems(issues);
  lines.push("", "要対応");
  for (const item of items.slice(0, maxItems)) {
    lines.push(`• ${item.name}（${item.detail}）`);
  }
  if (items.length > maxItems) {
    lines.push(`... 他${items.length - maxItems}件`);
  }

  lines.push("", "詳細はSonaBaseで確認", `${baseUrl}/supplies/list`);

  return lines.join("\n");
}
