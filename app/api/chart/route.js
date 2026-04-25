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

// ── Stooq symbol mapping ──────────────────────────────────────────────────────
const STOOQ_MAP = {
  "AAPL":     "aapl.us",
  "MSFT":     "msft.us",
  "GOOGL":    "googl.us",
  "AMZN":     "amzn.us",
  "META":     "meta.us",
  "NVDA":     "nvda.us",
  "TSLA":     "tsla.us",
  "NFLX":     "nflx.us",
  "ORCL":     "orcl.us",
  "AMD":      "amd.us",
  "^GSPC":    "^spx",
  "^DJI":     "^dji",
  "^IXIC":    "^ndx",
  "^VIX":     "^vix",
  "GC=F":     "xauusd",
  "CL=F":     "cl.f",
  "SI=F":     "xagusd",
  "NG=F":     "natgas.f",
  "HG=F":     "hgusd",
  "^IRX":     "irx.us",
  "^TNX":     "tnx.us",
  "^TYX":     "tyx.us",
  "DX-Y.NYB": "dxy.f",
  "USDKRW=X": "usdkrw",
};

// Calendar-day window for each period
const PERIOD_DAYS = {
  "1W": 7, "1M": 32, "3M": 95, "6M": 185, "1Y": 370, "2Y": 740,
};

// CoinGecko days param
const CG_DAYS = {
  "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730,
};

function parseCsvHistory(csv) {
  const lines = csv.trim().split("\n").filter(l => l && !l.toLowerCase().startsWith("date"));
  return lines.map(l => {
    const parts = l.split(",");
    return { date: parts[0]?.trim(), close: parseFloat(parts[4]) };
  }).filter(r => r.date && !isNaN(r.close));
}

function cutoff(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchStooqChart(symbol, period) {
  const stooqSym = STOOQ_MAP[symbol];
  if (!stooqSym) return null;
  try {
    const days = PERIOD_DAYS[period] || 95;
    const from = cutoff(days);
    const url = `https://stooq.com/q/d/l/?s=${stooqSym}&d1=${from.replace(/-/g, "")}&i=d`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const rows = parseCsvHistory(await r.text());
    if (rows.length === 0) return null;
    return rows.map(({ date, close }) => ({ date, close }));
  } catch { return null; }
}

async function fetchCoinGeckoChart(period) {
  try {
    const days = CG_DAYS[period] || 90;
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { cache: "no-store" }
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
      const r = await fetch(url, { cache: "no-store" });
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

  // All others: Stooq
  const prices = await fetchStooqChart(symbol, period);
  return Response.json({ prices: prices ?? [] });
}
