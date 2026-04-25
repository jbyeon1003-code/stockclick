export const runtime = "edge";

// Yahoo symbol → Twelve Data symbol
const TD_MAP = {
  "^GSPC":    "SPX",
  "^IXIC":    "IXIC",
  "^DJI":     "DJI",
  "^VIX":     "VIX",
  "GC=F":     "XAU/USD",
  "CL=F":     "WTI/USD",
  "SI=F":     "XAG/USD",
  "NG=F":     "NATGAS/USD",
  "HG=F":     "COPPER/USD",
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

export async function POST() {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return Response.json({});

  // Build comma-separated Twelve Data symbol list
  const tdSyms = ALL_SYMS.map(s => TD_MAP[s] || s).join(",");

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSyms)}&apikey=${key}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return Response.json({});
    const raw = await r.json();

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

    return Response.json(out);
  } catch {
    return Response.json({});
  }
}
