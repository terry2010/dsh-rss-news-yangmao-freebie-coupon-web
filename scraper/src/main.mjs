// scrape 主入口：各源 fetch → parse → filter → POST /v1/ingest（每源一个批次）
// GH Actions scrape.yml 每 30min 跑；失败不阻塞其他源
import { SOURCES } from "./sources.mjs";
import { fetchText } from "./fetch.mjs";
import { parseFeed } from "./rss.mjs";
import { postIngest } from "./sign.mjs";

const DRY = process.argv.includes("--dry-run");
const only = process.argv.find((a) => a.startsWith("--source="))?.slice(9);

async function scrapeSource(src) {
  const xml = await fetchText(src.url);
  let items = parseFeed(xml, { maxItems: src.maxItems ?? 30 });
  if (src.filter) {
    items = items.filter((it) => src.filter.test(`${it.title} ${it.summary ?? ""}`));
  }
  // 统一加 sourceName/category（api 侧 category 也可被 AI 改判）
  for (const it of items) {
    it.sourceName = src.name;
    it.category = it.category ?? src.category;
  }
  if (!items.length) {
    console.log(`[${src.id}] 0 items after filter`);
    return { source: src.id, n: 0 };
  }
  const res = await postIngest({ sourceId: src.id, items }, { dryRun: DRY });
  console.log(`[${src.id}] pushed ${items.length} items`, res);
  return { source: src.id, n: items.length };
}

const targets = only ? SOURCES.filter((s) => s.id === only) : SOURCES;
const results = [];
for (const src of targets) {
  try {
    results.push(await scrapeSource(src));
  } catch (e) {
    console.error(`[${src.id}] FAILED:`, e.message);
    results.push({ source: src.id, error: e.message });
  }
}
console.log("summary:", JSON.stringify(results));
if (results.every((r) => r.error)) process.exit(1);
