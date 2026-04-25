export const runtime = "edge";

// ── Twelve Data (optional override) ──────────────────────────────────────────
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

const US_STOCKS = ["AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD"];

// ── Stooq symbol mapping ──────────────────────────────────────────────────────
const STOOQ_MAP = {
  "^GSPC":    "^spx",
  "^DJI":     "^dji",
  "^IXIC":    "^ndx",
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(price) {
  return +price.toFixed(price >= 1000 ? 2 : price >= 10 ? 3 : 4);
}

/** Parse Stooq daily history CSV → [{date, close}] ascending */
function parseStooqHistory(csv) {
  const lines = csv.trim().split("\n").filter(l => l && !l.toLowerCase().