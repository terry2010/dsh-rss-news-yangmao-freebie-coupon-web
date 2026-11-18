// RSS 2.0 / Atom 解析 → IngestItem[]
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
});

function textOf(v) {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") return v["#cdata"] ?? v["#text"] ?? null;
  return null;
}
function linkOf(v) {
  // Atom link 可能是数组或 {href}
  if (Array.isArray(v)) v = v.find((l) => l["@_rel"] !== "self") ?? v[0];
  if (v && typeof v === "object") return v["@_href"] ?? textOf(v);
  return textOf(v);
}
const stripHtml = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** @returns IngestItem[] */
export function parseFeed(xml, { maxItems = 30 } = {}) {
  const doc = parser.parse(xml);
  const items = [];

  // RSS 2.0
  const rssItems = doc?.rss?.channel?.item;
  if (rssItems) {
    for (const it of (Array.isArray(rssItems) ? rssItems : [rssItems]).slice(0, maxItems)) {
      const link = linkOf(it.link) ?? linkOf(it.guid);
      const title = textOf(it.title);
      if (!link || !title) continue;
      items.push({
        externalId: String(textOf(it.guid) ?? link).slice(0, 300),
        title: title.slice(0, 300),
        summary: stripHtml(textOf(it.description)).slice(0, 500) || null,
        content: stripHtml(textOf(it["content:encoded"] ?? it.description)).slice(0, 8000) || null,
        officialUrl: link,
        sourceUrl: link,
        publishedAt: textOf(it.pubDate) ?? null,
      });
    }
    return items;
  }

  // Atom
  const entries = doc?.feed?.entry;
  if (entries) {
    for (const e of (Array.isArray(entries) ? entries : [entries]).slice(0, maxItems)) {
      const link = linkOf(e.link);
      const title = textOf(e.title);
      if (!link || !title) continue;
      items.push({
        externalId: String(textOf(e.id) ?? link).slice(0, 300),
        title: title.slice(0, 300),
        summary: stripHtml(textOf(e.summary)).slice(0, 500) || null,
        content: stripHtml(textOf(e.content)).slice(0, 8000) || null,
        officialUrl: link,
        sourceUrl: link,
        publishedAt: textOf(e.updated ?? e.published) ?? null,
      });
    }
  }
  return items;
}
