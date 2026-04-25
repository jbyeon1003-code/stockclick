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

// CoinGecko days 