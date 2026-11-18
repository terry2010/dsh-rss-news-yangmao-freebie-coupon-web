// 抓取工具：UA + timeout + 重试
const UA = "Mozilla/5.0 (compatible; ChuishibanBot/1.0; +https://chuishiban.com)";

export async function fetchText(url, { timeout = 20_000, retries = 2 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "*/*" },
        signal: AbortSignal.timeout(timeout),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}
