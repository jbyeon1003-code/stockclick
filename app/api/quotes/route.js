export const runtime = "edge";

const US_STOCKS = new Set(["AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD"]);

const YF_HDR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

const ALL_SYMS = [
  "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD",
  "^GSPC","^DJI","^IXIC","^VIX",
  "GC=F","CL=F","SI=F","NG=F","HG=F",
  "^IRX","^TNX","^TYX",
  "DX-Y.NYB","USDKRW=X","BTC-USD",
];

async function fetchFinnhub(sym, key) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.c) return null;
    return { price: d.c, change: +(d.d || 0).toFixed(2), changePct: +(d.dp || 0).toFixed(2) };
  } catch { return null; }
}

async function fetchYF(sym) {
  for (const base of ["query1", "query2"]) {
    try {
      const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d&includePrePost=false`;
      const r = await fetch(url, { headers: YF_HDR, cache: "no-store" });
      if (!r.ok) continue;
      const d = await r.json();
      const closes = (d.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(v => v != null);
      if (closes.length >= 2) {
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        const change = +(price - prev).toFixed(2);
        const changePct = +(change / prev * 100).toFixed(2);
        return { price, change, changePct };
      }
    } catch { continue; }
  }
  return null;
}

export async function POST() {
  const rawKey = process.env.FINNHUB_API_KEY || "";
  // Trim to 20 chars in case key was accidentally doubled
  const key = rawKey.slice(0, 20);

  const results = await Promise.all(ALL_SYMS.map(async sym => {
    let data = null;
    if (key && US_STOCKS.has(sym)) {
      data = await fetchFinnhub(sym, key);
    }
    if (!data) {
      data = await fetchYF(sym);
    }
    return [sym, data];
  }));

  const out = {};
  results.forEach(([sym, data]) => { if (data) out[sym] = data; });
  return Response.json(out);
}
