// CI 用：GET /v1/export → 产物
//   build/export.json      — astro build 的数据输入
//   data-dist/items.json   — data.chuishiban.com 全量快照（插件拉取）
//   data-dist/feeds/{ch}.json — 各频道 JSON Feed 1.1
//   data-dist/meta.json    — rev/datarev/dirty
// 结束后由 workflow 决定是否 ack（--ack 直接在此回写）
import { mkdirSync, writeFileSync } from "node:fs";

const API = process.env.API_BASE ?? "https://api.chuishiban.com";
const TOKEN = process.env.OWNER_TOKEN ?? "";
const SITE = process.env.SITE_BASE ?? "https://chuishiban.com";
const GO = process.env.GO_BASE ?? "https://go.chuishiban.com";

async function main() {
  if (!TOKEN) throw new Error("OWNER_TOKEN not set");

  // --ack：部署完成后回写 data_rev（读 meta.json，不重拉 export）
  if (process.argv.includes("--ack")) {
    const { readFileSync } = await import("node:fs");
    const meta = JSON.parse(readFileSync("data-dist/meta.json", "utf8"));
    const site = process.argv.includes("--site");
    const r = await fetch(`${API}/v1/export/ack`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ rev: meta.rev, site }),
    });
    console.log(`ack rev=${meta.rev} site=${site}:`, await r.text());
    return;
  }

  const res = await fetch(`${API}/v1/export`, {
    headers: { authorization: `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`export ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const exp = await res.json();
  const items = exp.items ?? [];

  mkdirSync("build", { recursive: true });
  mkdirSync("data-dist/feeds", { recursive: true });
  writeFileSync("build/export.json", JSON.stringify(exp, null, 1));

  // items.json：契约字段全量快照（插件整镜像替换）
  writeFileSync("data-dist/items.json", JSON.stringify({
    version: exp.version, rev: exp.rev, generatedAt: exp.generatedAt,
    items: items.map((i) => ({
      id: i.id, siteId: i.siteId, slug: i.slug, title: i.title,
      summary: i.summary, content: i.content, category: i.category,
      platform: i.platform, claimType: i.claimType, quota: i.quota,
      deadline: i.deadline, officialUrl: i.officialUrl,
      outboundUrl: i.outboundUrl ?? null,
      sourceUrl: i.sourceUrl, sourceName: i.sourceName,
      trusted: i.trusted, breaking: i.breaking, status: i.status,
      views: i.views, clicks: i.clicks,
      publishedAt: i.publishedAt, verifiedAt: i.verifiedAt,
      createdAt: i.createdAt, updatedAt: i.updatedAt,
    })),
  }));

  // JSON Feed 1.1 per channel + all
  const byCh = new Map();
  for (const i of items) {
    if (i.status !== "active") continue;
    const arr = byCh.get(i.category) ?? [];
    arr.push(i); byCh.set(i.category, arr);
  }
  const feedOf = (name, list) => ({
    version: "https://jsonfeed.org/version/1.1",
    title: `炊事班 · ${name}`,
    home_page_url: SITE,
    feed_url: `${SITE}/feeds/${name}.json`,
    items: list.map((i) => ({
      id: `${SITE}/item/${i.slug}`,
      url: `${SITE}/item/${i.slug}`,
      external_url: i.outboundUrl ?? `${GO}/go/${i.slug}?ch=feed`,
      title: i.title,
      content_text: `${i.summary ?? ""}\n额度:${i.quota ?? "-"} 平台:${i.platform ?? "-"} deadline:${i.deadline ?? "-"}\n去领取:${i.outboundUrl ?? `${GO}/go/${i.slug}?ch=feed`}`,
      date_published: i.publishedAt ?? i.createdAt,
      tags: [i.category, i.platform].filter(Boolean),
    })),
  });
  writeFileSync("data-dist/feeds/all.json", JSON.stringify(
    feedOf("all", items.filter((i) => i.status === "active"))));
  for (const [ch, list] of byCh) {
    writeFileSync(`data-dist/feeds/${ch}.json`, JSON.stringify(feedOf(ch, list)));
  }

  writeFileSync("data-dist/meta.json", JSON.stringify({
    rev: exp.rev, dataRev: exp.dataRev, dirty: exp.dirty,
    generatedAt: exp.generatedAt,
  }));
  writeFileSync("data-dist/_headers",
    "/items.json\n  Cache-Control: public, max-age=60\n/feeds/*\n  Cache-Control: public, max-age=300\n");

  console.log(`export rev=${exp.rev} datarev=${exp.dataRev} dirty=${exp.dirty} items=${items.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
