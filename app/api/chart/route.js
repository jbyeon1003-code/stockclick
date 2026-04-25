export const runtime = "edge";

const CFG = {
  "1W": { interval: "1day",  outputsize: 8   },
  "1M": { interval: "1day",  outputsize: 35  },
  "3M": { interval: "1day",  outputsize: 95  },
  "6M": { interval: "1week", outputsize: 28  },
  "1Y": { interval: "1week", outputsize: 55  },
  "2Y": { interval: "1week", outputsize: 108 },
};

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

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const key = process.env.TWELVE_DATA_API_KEY;
    if (!key) return Response.json({ prices: [] });

    const tdSym = TD_MAP[symbol] || symbol;
    // Do NOT encode the symbol — Twelve Data expects raw format e.g. XAU/USD
    const url = `https://api.twelvedata.com/time_series?symbol=${tdSym}&interval=${cfg.interval}&outputsize=${cfg.outputsize}&apikey=${key}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return Response.json({ prices: [] });

    const data = await r.json();
    if (!data.values || data.status === "error") return Response.json({ prices: [] });

    // values are newest-first; reverse to oldest-first for chart rendering
    const prices = [...data.values]
      .reverse()
      .map(v => parseFloat(v.close))
      .filter(v => !isNaN(v))
      .map(v => +v.toFixed(v >= 100 ? 2 : 4));

    return Response.json({ prices });
  } catch {
    return Response.json({ prices: [] });
  }
}
