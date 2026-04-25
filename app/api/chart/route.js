export const runtime = "edge";

const CFG = {
  "1W": { resolution: "D", days: 7,  range: "5d",  iv: "1d" },
  "1M": { resolution: "D", days: 31, range: "1mo", iv: "1d" },
  "3M": { resolution: "D", days: 92, range: "3mo", iv: "1d" },
  "6M": { resolution: "D", days: 183,range: "6mo", iv: "1wk" },
  "1Y": { resolution: "W", days: 365,range: "1y",  iv: "1wk" },
  "2Y": { resolution: "W", days: 730,range: "2y",  iv: "1wk" },
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE = {
  "User-Agent": UA,
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

// Returns cookies + crumb by fetching finance.yahoo.com (same approach as quotes auth)
async function getYFAuth() {
  try {
    const r = await fetch("https://finance.yahoo.com/quote/AAPL", {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    const sc = r.headers.get("set-cookie");
    if (!sc) return null;
    const cookieStr = sc
      .split(/,(?=\s*[A-Za-z_][A-Za-z0-9_-]*\s*=)/)
      .map(c => c.trim().split(";")[0])
      .filter(Boolean)
      .join("; ");
    if (!cookieStr) return null;
    const cr = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...BASE, Cookie: cookieStr },
    });
    if (!cr.ok) return null;
    const crumb = (await cr.text()).trim();
    if (!crumb || crumb.length > 50 || crumb.includes("<") || crumb.includes("{")) return null;
    return { crumb, cookieStr };
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const sym = encodeURIComponent(symbol);
    const key = process.env.FINNHUB_API_KEY;

    // 1) Finnhub candle + YF auth in parallel (fast path)
    const [finnhubResult, auth] = await Promise.all([
      key ? (async () => {
        try {
          const to = Math.floor(Date.now() / 1000);
          const from = to - cfg.days * 24 * 60 * 60;
          const url = `https://finnhub.io/api/v1/stock/candle?symbol=${sym}&resolution=${cfg.resolution}&from=${from}&to=${to}&token=${key}`;
          const r = await fetch(url);
          if (!r.ok) return null;
          const d = await r.json();
          if (!d.c || d.s === "no_data" || !d.t?.length) return null;
          return d.t.map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split("T")[0],
            close: +d.c[i].toFixed(2),
            open: +d.o[i].toFixed(2),
            high: +d.h[i].toFixed(2),
            low: +d.l[i].toFixed(2),
            volume: d.v[i],
          }));
        } catch { return null; }
      })() : Promise.resolve(null),
      getYFAuth(),
    ]);

    // Use Finnhub result if available
    if (finnhubResult?.length) return Response.json({ prices: finnhubResult });

    // 2) Yahoo Finance with auth (crumb + cookie)
    if (auth) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false&crumb=${encodeURIComponent(auth.crumb)}`;
        const res = await fetch(url, { headers: { ...BASE, Cookie: auth.cookieStr }, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
          const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
          if (prices.length) return Response.json({ prices });
        }
      } catch {}
    }

    // 3) Yahoo Finance without auth (query1 then query2)
    for (const base of ["query1", "query2"]) {
      try {
        const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`;
        const res = await fetch(url, { headers: BASE, cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
        if (prices.length) return Response.json({ prices });
      } catch { continue; }
    }

    return Response.json({ prices: [] });
  } catch {
    return Response.json({ prices: [] });
  }
}
