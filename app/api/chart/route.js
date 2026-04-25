export const runtime = "edge";

const TD_CFG = {
  "1W": { interval: "1day",  outputsize: 8   },
  "1M": { interval: "1day",  outputsize: 35  },
  "3M": { interval: "1day",  outputsize: 95  },
  "6M": { interval: "1week", outputsize: 28  },
  "1Y": { interval: "1week", outputsize: 55  },
  "2Y": { interval: "1week", outputsize: 108 },
};

const YF_CFG = {
  "1W": { range: "5d",  interval: "1d"  },
  "1M": { range: "1mo", interval: "1d"  },
  "3M": { range: "3mo", interval: "1d"  },
  "6M": { range: "6mo", interval: "1wk" },
  "1Y": { range: "1y",  interval: "1wk" },
  "2Y": { range: "2y",  interval: "1wk" },
};

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

const YF_HDR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

async function fetchYFChart(symbol, period) {
  const cfg = YF_CFG[period] || YF_CFG["3M"];
  for (const base of ["query1", "query2"]) {
    try {
      const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false`;
      const r = await fetch(url, { headers: YF_HDR, cache: "no-store" });
      if (!r.ok) continue;
      const data = await r.json();
      const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const prices = closes
        .filter(v => v != null)
        .map(v => +v.toFixed(v >= 100 ? 2 : 4));
      if (prices.length > 0) return prices;
    } catch { continue; }
  }
  return null;
}

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const key = process.env.TWELVE_DATA_API_KEY;

    if (key) {
      const cfg = TD_CFG[period] || TD_CFG["3M"];
      const tdSym = TD_MAP[symbol] || symbol;
      const url = `https://api.twelvedata.com/time_series?symbol=${tdSym}&interval=${cfg.interval}&outputsize=${cfg.outputsize}&apikey=${key}`;
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          if (data.values && data.status !== "error") {
            const prices = [...data.values]
              .reverse()
              .map(v => parseFloat(v.close))
              .filter(v => !isNaN(v))
              .map(v => +v.toFixed(v >= 100 ? 2 : 4));
            if (prices.length > 0) return Response.json({ prices });
          }
        }
      } catch {}
    }

    // Fallback: Yahoo Finance (no key required)
    const prices = await fetchYFChart(symbol, period);
    return Response.json({ prices: prices ?? [] });
  } catch {
    return Response.json({ prices: [] });
  }
}
