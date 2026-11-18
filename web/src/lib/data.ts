// 构建期数据：读 ../build/export.json（CI 由 export-data.mjs 生成）
// 本地 dev 无 export 时用 SAMPLE 兜底，保证 astro dev 能跑
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface ExportItem {
  id: string; siteId: number; slug: string; title: string;
  summary: string | null; content: string | null; category: string;
  platform: string | null; claimType: string | null; quota: string | null;
  deadline: string | null; officialUrl: string | null; outboundUrl: string | null;
  sourceUrl: string | null; sourceName: string | null;
  trusted: boolean; breaking: boolean; status: string;
  views: number; clicks: number;
  publishedAt: string | null; verifiedAt: string | null;
  createdAt: string; updatedAt: string;
}
export interface Export {
  version: number; rev: number; dataRev: number; dirty: boolean;
  generatedAt: string; channels: string[];
  channelCounts: Record<string, number>;
  items: ExportItem[];
}

export const API_BASE = "https://api.chuishiban.com";
export const DATA_BASE = "https://data.chuishiban.com";
export const GO_BASE = "https://go.chuishiban.com";
export const SITE_NAME = "炊事班";

export const CHANNEL_NAMES: Record<string, string> = {
  ai: "AI 福利", vps: "VPS/云", deal: "优惠", game: "游戏",
  software: "软件", credit: "信用卡",
};

const SAMPLE: Export = {
  version: 1, rev: 0, dataRev: 0, dirty: false,
  generatedAt: new Date().toISOString(),
  channels: ["ai", "vps", "deal", "game", "software"],
  channelCounts: { ai: 1 },
  items: [{
    id: "sample:1", siteId: 1, slug: "sample", title: "示例羊毛（本地 dev 兜底数据）",
    summary: "CI 构建时此处为真实 export 数据", content: null,
    category: "ai", platform: "Example", claimType: "direct",
    quota: "$10", deadline: "2099-12-31",
    officialUrl: "https://example.com", outboundUrl: null,
    sourceUrl: null, sourceName: "sample",
    trusted: true, breaking: false, status: "active",
    views: 0, clicks: 0, publishedAt: new Date().toISOString(),
    verifiedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }],
};

export function loadExport(): Export {
  const p = fileURLToPath(new URL("../../../build/export.json", import.meta.url));
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, "utf8")) as Export; } catch { /* fallthrough */ }
  }
  return SAMPLE;
}

export const claimName = (c: string | null) =>
  ({ direct: "直领", redeem: "兑换码", claim: "需领取", checkin: "签到" })[c ?? ""] ?? c ?? "领取";

export const chName = (c: string) => CHANNEL_NAMES[c] ?? c;

export function goUrl(it: ExportItem): string {
  return it.outboundUrl ?? `${GO_BASE}/go/${it.slug}?ch=web`;
}
export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline + "T23:59:59").getTime() - Date.now()) / 86400_000);
}
