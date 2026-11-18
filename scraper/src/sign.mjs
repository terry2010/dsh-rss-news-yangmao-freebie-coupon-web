// HMAC 签名 + POST /v1/ingest
// sig = hmac256(INGEST_SECRET, `${keyId}.${ts}.${body}`)
import { createHmac } from "node:crypto";

const API = process.env.API_BASE ?? "https://api.chuishiban.com";
const SECRET = process.env.INGEST_SECRET ?? "";
const KEY_ID = process.env.INGEST_KEY_ID ?? "chuishiban-v1";

export async function postIngest(payload, { dryRun = false } = {}) {
  const body = JSON.stringify(payload);
  if (dryRun) {
    console.log(`[dry-run] ${payload.sourceId}: ${payload.items?.length ?? 0} items`);
    return { dryRun: true };
  }
  if (!SECRET) throw new Error("INGEST_SECRET not set");
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", SECRET).update(`${KEY_ID}.${ts}.${body}`).digest("hex");
  const res = await fetch(`${API}/v1/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ts": ts, "x-sig": sig },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ingest ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}
