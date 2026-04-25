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

function parseCsvHistory(csv) {
  const lines = csv.trim().split("\n").filter(l => l && !l.toLowerCase().startsWith("date"));
  return lines.map(l => {
    const parts = l.split(",");
    const close = parseFloat(parts[4]);
    return { close };
  }).filter(r => !isNaN(r.close));
}

async function fetchStooqQuote(sym) {
  const stooqSym = STOOQ_MAP[sym];
  if (!stooqSym) return null;
  try {
    const url = `https://stooq.com/q/d/l/?s=${stooqSym}&i=d`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const rows = parseCsvHistory(await r.text());
    if (rows.length < 2) return null;
    const price = rows[rows.length - 1].close;
    const prev = rows[rows.length - 2].close;
    const change = +(price - prev).toFixed(4);
    const changePct = +(change / prev * 100).toFixed(2);
    return { price: fmt(price), change, changePct };
  } catch { return null; }
}

async function fetchFinnhubQuotes(key) {
  const out = {};
  await Promise.all(US_STOCKS.map(async sym => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`);
      if (!r.ok) return;
      const d = await r.json();
      if (!d.c || d.c === 0 || !d.pc) return;
      const price = d.c;
      const change = +(price - d.pc).toFixed(4);
      const changePct = +(change / d.pc * 100).toFixed(2);
      out[sym] = { price: fmt(price), change, changePct };
    } catch {}
  }));
  return out;
}

async function fetchVIX() {
  try {
    const r = await fetch("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv");
    if (!r.ok) return null;
    const rows = parseCsvHistory(await r.text());
    if (rows.length < 2) return null;
    const price = rows[rows.length - 1].close;
    const prev = rows[rows.length - 2].close;
    const change = +(price - prev).toFixed(4);
    const changePct = +(change / prev * 100).toFixed(2);
    return { price: fmt(price), change, changePct };
  } catch { return null; }
}

async function fetchBTC() {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
    );
    if (!r.ok) return null;
    const d = await r.json();
    const price = d.bitcoin?.usd;
    const changePct = d.bitcoin?.usd_24h_change;
    if (!price) return null;
    const change = +(price * changePct / 100).toFixed(4);
    return { price: fmt(price), change, changePct: +changePct.toFixed(2) };
  } catch { return null; }
}

export async function POST() {
  const tdKey = process.env.TWELVE_DATA_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const out = {};

  // Twelve Data primary override
  if (tdKey) {
    try {
      const tdSyms = ALL_SYMS.map(s => TD_MAP[s] || s).join(",");
      const r = await fetch(`https://api.twelvedata.com/quote?symbol=${tdSyms}&apikey=${tdKey}`);
      if (r.ok) {
        const raw = await r.json();
        if (raw.status !== "error") {
          ALL_SYMS.forEach(sym => {
            const d = raw[TD_MAP[sym] || sym] || raw[sym];
            if (!d || d.status === "error" || !d.close) return;
            const price = parseFloat(d.close);
            if (isNaN(price)) return;
            out[sym] = {
              price: fmt(price),
              change: +parseFloat(d.change || 0).toFixed(4),
              changePct: +parseFloat(d.percent_change || 0).toFixed(2),
            };
          });
          if (Object.keys(out).length > 0) return Response.json(out);
        }
      }
    } catch {}
  }

  // US stocks: Finnhub (if key) or Stooq
  if (finnhubKey) {
    Object.assign(out, await fetchFinnhubQuotes(finnhubKey));
  } else {
    await Promise.all(US_STOCKS.map(async sym => {
      const d = await fetchStooqQuote(sym);
      if (d) out[sym] = d;
    }));
  }

  // Indices / commodities / bonds / FX: Stooq
  await Promise.all(
    ALL_SYMS.filter(s => !US_STOCKS.includes(s) && s !== "^VIX" && s !== "BTC-USD").map(async sym => {
      const d = await fetchStooqQuote(sym);
      if (d) out[sym] = d;
    })
  );

  // VIX: CBOE CSV
  const vix = await fetchVIX();
  if (vix) out["^VIX"] = vix;

  // BTC: CoinGecko
  const btc = await fetchBTC();
  if (btc) out["BTC-USD"] = btc;

  return Response.json(out);
}
