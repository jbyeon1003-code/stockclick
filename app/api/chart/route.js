export const runtime = "edge";

const CFG = {
  "1W": { resolution: "D", days: 7,  range: "5d",  iv: "1d" },
  "1M": { resolution: "D", days: 31, range: "1mo", iv: "1d" },
  "3M": { resolution: "D", days: 92, range: "3mo", iv: "1d" },
  "6M": { resolution: "D", days: 183,range: "6mo", iv: "1wk" },
  "1Y": { resolution: "W", days: 365,range: "1y",  iv: "1wk" },
  "2Y": { resolution: "W", days: 730,range: "2y",  iv: "1wk" },
};

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const key = process.env.FINNHUB_API_KEY;
    const sym = encodeURIComponent(symbol);

    // 1) Finnhub stock candle (if key available)
    if (key) {
      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - cfg.days * 24 * 60 * 60;
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${sym}&resolution=${cfg.resolution}&from=${from}&to=${to}&token=${key}`;
        const r = await fetch(url);
        if (r.ok) {
          const d = await r.json();
          if (d.c && d.s !== "no_data" && d.t?.length > 0) {
            const prices = d.t.map((ts, i) => ({
              date: new Date(ts * 1000).toISOString().split("T")[0],
              close: +d.c[i].toFixed(2),
              open: +d.o[i].toFixed(2),
              high: +d.h[i].toFixed(2),
              low: +d.l[i].toFixed(2),
              volume: d.v[i],
            }));
            if (prices.length > 0) return Response.json({ prices });
          }
        }
      } catch {}
    }

    // 2) Yahoo Finance v8 fallback (query1 then query2)
    const yfUrls = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`,
    ];
    for (const url of yfUrls) {
      try {
        const res = await fetch(url, { headers: YF_HEADERS, cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
        if (prices.length > 0) return Response.json({ prices });
      } catch {
        continue;
      }
    }

    return Response.json({ prices: [] });
  } catch {
    return Response.json({ prices: [] });
  }
}
