export const runtime = "edge";

// Yahoo symbol → Twelve Data symbol
const TD_MAP = {
  "^GSPC":    "SPX",
  "^IXIC":    "IXIC",
  "^DJI":     "DJI",
  "^VIX":     "VIX",
  "GC=F":     "XAU/USD",
  "CL=F":     "USOIL",
  "SI=F":     "XAG/USD",
  "NG=F":     "NATGAS",
  "HG=F":     "COPPER",
  "^IRX":     "IRX",
  "^TNX":     "TNX",
  "^TYX":     "TYX",
  "DX-Y.NYB": "DXY",
  "USDKRW=X": "USD/KRW",
  "BTC-USD":  "BTC/USD",
};

const ALL_SYMS = [
  "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD",
  "^GSPC","^DJI","^IXIC","^VIX",
  "GC=F","CL=F","SI=F","NG=F","HG=F",
  "^IRX","^TNX","^TYX",
  "DX-Y.NYB","USDKRW=X","BTC-USD",
];

const YF_HDR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

async function fetchYFQuote(sym) {
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
        const change = +(price - prev).toFixed(4);
        const changePct = +(change / prev * 100).toFixed(2);
        return { price: +price.toFixed(price >= 1000 ? 2 : price >= 10 ? 3 : 4), change, changePct };
      }
    } catch { continue; }
  }
  return null;
}

async function fetchAllYF() {
  const results = await Promise.all(ALL_SYMS.map(async sym => [sym, await fetchYFQuote(sym)]));
  const out = {};
  results.forEach(([sym, data]) => { if (data) out[sym] = data; });
  return out;
}

export async function POST() {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (key) {
    const tdSyms = ALL_SYMS.map(s => TD_MAP[s] || s).join(",");
    try {
      const url = `https://api.twelvedata.com/quote?symbol=${tdSyms}&apikey=${key}`;
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const raw = await r.json();
        if (raw.status !== "error") {
          const out = {};
          ALL_SYMS.forEach(sym => {
            const tdSym = TD_MAP[sym] || sym;
            const d = raw[tdSym] || raw[sym];
            if (!d || d.status === "error" || !d.close) return;
            const price = parseFloat(d.close);
            const change = parseFloat(d.change || 0);
            const changePct = parseFloat(d.percent_change || 0);
            if (isNaN(price)) return;
            out[sym] = {
              price: +price.toFixed(price >= 1000 ? 2 : price >= 10 ? 3 : 4),
              change: +change.toFixed(4),
              changePct: +changePct.toFixed(2),
            };
          });
          if (Object.keys(out).length > 0) return Response.json(out);
        }
      }
    } catch {}
  }

  // Fallback: Yahoo Finance (no key required)
  return Response.json(await fetchAllYF());
}
