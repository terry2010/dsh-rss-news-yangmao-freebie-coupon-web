# dsh-rss-news-yangmao-freebie-coupon-web

「炊事班」公有仓：站点源码 + 采集器 + CI。

```
web/        Astro SSG 静态站 → CF Pages（chuishiban.com）
scraper/    采集器（RSS/Atom → POST /v1/ingest HMAC）→ GH Actions 每 30min
scripts/    export-data.mjs：/v1/export → items.json + feeds → data-dist/
.github/    scrape.yml（*/30min）+ rebuild.yml（*/30min + dispatch）
```

## CI secrets

| secret | 用途 |
|---|---|
| `INGEST_SECRET` | scraper HMAC 签名（与 api .env 一致） |
| `OWNER_TOKEN` | export/ack 鉴权（admin.sh token 生成） |
| `CF_API_TOKEN` | wrangler pages deploy |
| `CF_ACCOUNT_ID` | 同上 |

vars：`API_BASE`（默认 https://api.chuishiban.com）、`INGEST_KEY_ID`

## 本地

```bash
# 采集（dry-run 只看解析）
cd scraper && npm i && node src/main.mjs --dry-run
# 站点（需先跑一次 export-data 生成 build/export.json）
OWNER_TOKEN=xxx API_BASE=https://api.chuishiban.com node scripts/export-data.mjs
cd web && npm i && npm run build
```

相关：API 代码在私有仓 `chuishiban`；DSH 插件在 `dsh-rss-news-yangmao-freebie-coupon`。
