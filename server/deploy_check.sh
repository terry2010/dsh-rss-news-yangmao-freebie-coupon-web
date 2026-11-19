#!/usr/bin/env bash
# chuishiban.com 自动部署：ff-pull + export 数据 + dirty/代码变更时重建 astro 站
# cron:  */10 * * * * /data1/htdocs/chuishiban.com/server/deploy_check.sh >> /tmp/chuishiban-deploy.log 2>&1
#
# 依赖：VPS host 上 node>=20（export-data.mjs + astro build）。
# secrets 放仓外（本仓公开）：/data1/service/chuishiban/env
#   OWNER_TOKEN=xxx        必填，export/ack 鉴权
#   API_BASE=https://api.chuishiban.com   可选覆盖
#
# 每轮做什么：
#   1) git pull --ff-only（代码有无更新都继续——数据是独立变化的）
#   2) export-data.mjs → build/export.json + data-dist/（data 站 nginx 直接读盘）
#   3) dirty 或代码变更 → npm run build → web/dist（主站 root）
#   4) ack（重建过带 --site 清 dirty；build 失败不清、下轮自动重试）
#   5) server/chuishiban.nginx.conf 变了 → cp 到 conf.d + nginx -t + reload
set -u
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

REPO=/data1/htdocs/chuishiban.com
ENV_FILE=/data1/service/chuishiban/env
CONF_DST=/data1/conf/nginx/conf.d/chuishiban.com.conf

[ -f "$ENV_FILE" ] && . "$ENV_FILE"
export API_BASE="${API_BASE:-https://api.chuishiban.com}"
export SITE_BASE=https://chuishiban.com
export GO_BASE=https://go.chuishiban.com
export OWNER_TOKEN="${OWNER_TOKEN:-}"

before=$(git -C "$REPO" rev-parse HEAD)
if ! git -C "$REPO" pull --ff-only -q; then
  echo "$(date -Is) git pull --ff-only FAILED（VPS 上有本地改动？）"; exit 1
fi
after=$(git -C "$REPO" rev-parse HEAD)
code_changed=0
if [ "$before" != "$after" ]; then code_changed=1; echo "$(date -Is) pulled $before..$after"; fi

# 1) export → build/export.json + data-dist/（失败沿用上一轮数据，不 ack）
export_ok=0
if [ -n "$OWNER_TOKEN" ]; then
  if node "$REPO/scripts/export-data.mjs"; then export_ok=1; else echo "$(date -Is) export FAILED, keep last data"; fi
else
  echo "$(date -Is) OWNER_TOKEN missing ($ENV_FILE), skip export"
fi

dirty=false
if [ "$export_ok" = 1 ]; then
  dirty=$(node -e "try{process.stdout.write(String(JSON.parse(require('fs').readFileSync('$REPO/data-dist/meta.json','utf8')).dirty))}catch(e){process.stdout.write('false')}")
fi

# 2) 主站重建：数据 dirty 或代码变了
rebuilt=0
if [ "$dirty" = true ] || [ "$code_changed" = 1 ]; then
  if [ ! -d "$REPO/web/node_modules" ] || { [ "$code_changed" = 1 ] && git -C "$REPO" diff --name-only "$before" "$after" | grep -q '^web/package-lock.json$'; }; then
    npm --prefix "$REPO/web" ci
  fi
  if npm --prefix "$REPO/web" run build; then
    rebuilt=1
    echo "$(date -Is) site rebuilt (dirty=$dirty code_changed=$code_changed)"
  else
    echo "$(date -Is) astro build FAILED, old dist still serving"
  fi
fi

# 3) ack：data_rev 追平；重建成功带 --site 清 dirty
if [ "$export_ok" = 1 ]; then
  node "$REPO/scripts/export-data.mjs" --ack $([ "$rebuilt" = 1 ] && echo --site)
fi

# 4) nginx conf 有变更：同步 + 校验 + reload（zhuikan.net 同款）
if [ "$code_changed" = 1 ] && git -C "$REPO" diff --name-only "$before" "$after" | grep -q '^server/chuishiban.nginx.conf$'; then
  cp "$REPO/server/chuishiban.nginx.conf" "$CONF_DST"
  if docker exec nginx nginx -t; then
    docker exec nginx nginx -s reload
    echo "$(date -Is) nginx conf updated + reloaded"
  else
    echo "$(date -Is) nginx -t FAILED, old conf still running; fix and reload manually"
  fi
fi
