# dsh-rss-news-yangmao-freebie-coupon-web

「炊事班」公有仓：站点源码 + 采集器 + CI。

```
web/        Astro SSG 静态站 → VPS nginx（chuishiban.com，root=web/dist）
scraper/    采集器（RSS/Atom → POST /v1/ingest HMAC）→ GH Actions 每 30min
scripts/    export-data.mjs：/v1/export → items.json + feeds → data-dist/（data.chuishiban.com）
server/     deploy_check.sh（VPS cron */10min：ff-pull + export + dirty 时重建）+ chuishiban.nginx.conf
.github/    scrape.yml（*/30min）；rebuild.yml 是 CF Pages 时代的部署，纯 VPS 下可删
```

## VPS 部署（zhuikan.net 同模型）

VPS 上单一 clone `/data1/htdocs/chuishiban.com`，cron 每 10min 跑 `server/deploy_check.sh`：

- ff-pull 代码；`export-data.mjs` 刷 `data-dist/`（data 站立即生效）
- `dirty` 或代码变更 → `npm --prefix web run build` → `web/dist`（主站 root，nginx 直接读盘）
- ack 追平 data_rev；重建成功带 `--site` 清 dirty（build 失败不清，下轮重试）
- `server/chuishiban.nginx.conf` 变更自动 cp 到 `/data1/conf/nginx/conf.d/` + `nginx -t` + reload

一次性设置：

```bash
git clone https://github.com/terry2010/dsh-rss-news-yangmao-freebie-coupon-web.git /data1/htdocs/chuishiban.com
# host 需要 node>=20；secrets 放仓外（公开仓，别入库）
mkdir -p /data1/service/chuishiban && printf 'OWNER_TOKEN=xxx\n' > /data1/service/chuishiban/env && chmod 600 /data1/service/chuishiban/env
cp server/chuishiban.nginx.conf /data1/conf/nginx/conf.d/chuishiban.com.conf
certbot certonly --webroot -w /data1/webroot -d chuishiban.com -d www.chuishiban.com -d data.chuishiban.com
docker exec nginx nginx -t && docker exec nginx nginx -s reload
# crontab:
*/10 * * * * /data1/htdocs/chuishiban.com/server/deploy_check.sh >> /tmp/chuishiban-deploy.log 2>&1
```

规则：别在 VPS 上直改 repo（堵 ff-pull），改代码 push 即上线（≤10min）。

## GH Actions secrets（仅 scrape.yml 用）

| secret | 用途 |
|---|---|
| `INGEST_SECRET` | scraper HMAC 签名（与 api .env 一致） |

vars：`API_BASE`（默认 https://api.chuishiban.com）、`INGEST_KEY_ID`

`OWNER_TOKEN` / `CF_API_TOKEN` / `CF_ACCOUNT_ID` 只在 VPS env 或留着跑 CF 的 rebuild.yml 时需要。

## 本地

```bash
# 采集（dry-run 只看解析）
cd scraper && npm i && node src/main.mjs --dry-run
# 站点（需先跑一次 export-data 生成 build/export.json）
OWNER_TOKEN=xxx API_BASE=https://api.chuishiban.com node scripts/export-data.mjs
cd web && npm i && npm run build
```

相关：API 代码在私有仓 `chuishiban`；DSH 插件在 `dsh-rss-news-yangmao-freebie-coupon`。
