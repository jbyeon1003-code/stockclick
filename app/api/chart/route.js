export const runtime = "edge";

// ── Twelve Data config (primary if API key set) ───────────────────────────────
const TD_CFG = {
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

// CoinGecko days param
const CG_DAYS = {
  "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730,
};

// Yahoo Finance period mapping
const YF_CFG = {
  "1W": { range: "5d",  interval: "1d"  },
  "1M": { range: "1mo", interval: "1d"  },
  "3M": { range: "3mo", interval: "1d"  },
  "6M": { range: "6mo", interval: "1wk" },
  "1Y": { range: "1y",  interval: "1wk" },
  "2Y": { range: "2y",  interval: "1wk" },
};

async function fetchYFChart(symbol, period) {
  try {
    const cfg = YF_CFG[period] || YF_CFG["3M"];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    const d = await r.json();
    const result = d.chart?.result?.[0];
    if (!result) return null;
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const prices = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null || isNaN(close)) continue;
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      prices.push({ date, close: +close.toFixed(4) });
    }
    return prices.length > 0 ? prices : null;
  } catch { return null; }
}

async function fetchCoinGeckoChart(period) {
  try {
    const days = CG_DAYS[period] || 90;
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.prices?.length) return null;
    return d.prices.map(([ts, close]) => ({
      date: new Date(ts).toISOString().slice(0, 10),
      close: +close.toFixed(2),
    }));
  } catch { return null; }
}

export async function POST(req) {
  const { symbol, period = "3M" } = await req.json();
  if (!symbol) return Response.json({ prices: [] });

  const tdKey = process.env.TWELVE_DATA_API_KEY;

  // Twelve Data primary override
  if (tdKey) {
    const cfg = TD_CFG[period] || TD_CFG["3M"];
    const tdSym = TD_MAP[symbol] || symbol;
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${tdSym}&interval=${cfg.interval}&outputsize=${cfg.outputsize}&apikey=${tdKey}`;
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        if (d.status !== "error" && d.values?.length) {
          const prices = d.values
            .map(v => ({ date: v.datetime.slice(0, 10), close: parseFloat(v.close) }))
            .filter(v => !isNaN(v.close))
            .reverse();
          if (prices.length > 0) return Response.json({ prices });
        }
      }
    } catch {}
  }

  // BTC: CoinGecko
  if (symbol === "BTC-USD") {
    const prices = await fetchCoinGeckoChart(period);
    return Response.json({ prices: prices ?? [] });
  }

  // All others: Yahoo Finance
  const prices = await fetchYFChart(symbol, period);
  return Response.json({ prices: prices ?? [] });
}
