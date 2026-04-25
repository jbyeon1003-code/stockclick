export const runtime = "edge";

const ALL_SYMS = [
  "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD",
  "^GSPC","^DJI","^IXIC","^VIX",
  "GC=F","CL=F","SI=F","NG=F","HG=F",
  "^IRX","^TNX","^TYX",
  "DX-Y.NYB","USDKRW=X","BTC-USD",
];

const US_STOCKS = ["AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD"];

// Commodity → Finnhub ETF proxy
const COMMODITY_ETF = {
  "GC=F": "GLD",
  "CL=F": "USO",
  "SI=F": "SLV",
  "NG=F": "UNG",
  "HG=F": "COPX",
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

// ── Finnhub (US stocks + commodity ETFs) ─────────────────────────────────────
async function fetchFinnhubQuote(sym, key) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.c || d.c === 0 || !d.pc) return null;
    const price = d.c;
    const change = +(price - d.pc).toFixed(4);
    const changePct = +(change / d.pc * 100).toFixed(2);
    return { price: fmt(price), change, changePct };
  } catch { return null; }
}

async function fetchFinnhubBatch(syms, key) {
  const out = {};
  await Promise.all(syms.map(async sym => {
    const d = await fetchFinnhubQuote(sym, key);
    if (d) out[sym] = d;
  }));
  return out;
}

// ── Yahoo Finance v8 (indices) ────────────────────────────────────────────────
async function fetchYFQuote(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=2d&interval=1d`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    const d = await r.json();
    const closes = d.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v => v != null) ?? [];
    if (closes.length < 2) return null;
    const price = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const change = +(price - prev).toFixed(4);
    const changePct = +(change / prev * 100).toFixed(2);
    return { price: fmt(price), change, changePct };
  } catch { return null; }
}

// ── VIX: CBOE CSV ─────────────────────────────────────────────────────────────
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

// ── Treasury XML (bonds) ──────────────────────────────────────────────────────
async function fetchTreasuryYields() {
  try {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${ym}`;
    const r = await fetch(url);
    if (!r.ok) return {};
    const text = await r.text();

    // Extract all entries with date + the three yields
    const entries = [...text.matchAll(
      /<d:NEW_DATE>([^<]+)<\/d:NEW_DATE>[\s\S]*?<d:BC_3MONTH[^>]*>([^<]*)<\/d:BC_3MONTH>[\s\S]*?<d:BC_10YEAR[^>]*>([^<]*)<\/d:BC_10YEAR>[\s\S]*?<d:BC_30YEAR[^>]*>([^<]*)<\/d:BC_30YEAR>/g
    )];

    if (!entries.length) return {};
    const last = entries[entries.length - 1];
    const prev = entries.length > 1 ? entries[entries.length - 2] : null;

    const makeYield = (cur, prevVal) => {
      const p = parseFloat(cur);
      const pp = prevVal != null ? parseFloat(prevVal) : p;
      if (isNaN(p)) return null;
      const pp2 = isNaN(pp) ? p : pp;
      return {
        price: +p.toFixed(3),
        change: +(p - pp2).toFixed(4),
        changePct: +(((p - pp2) / pp2) * 100).toFixed(2),
      };
    };

    return {
      "^IRX": makeYield(last[2], prev?.[2]),
      "^TNX": makeYield(last[3], prev?.[3]),
      "^TYX": makeYield(last[4], prev?.[4]),
    };
  } catch { return {}; }
}

// ── ExchangeRate-API (FX) ─────────────────────────────────────────────────────
async function fetchExchangeRates() {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!r.ok) return {};
    const d = await r.json();
    const out = {};
    const krw = d.rates?.KRW;
    if (krw) out["USDKRW=X"] = { price: +krw.toFixed(2), change: 0, changePct: 0 };
    return out;
  } catch { return {}; }
}

// ── BTC: CoinGecko ────────────────────────────────────────────────────────────
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

// ── Twelve Data (optional full override) ─────────────────────────────────────
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

async function fetchTwelveData(key) {
  try {
    const tdSyms = ALL_SYMS.map(s => TD_MAP[s] || s).join(",");
    const r = await fetch(`https://api.twelvedata.com/quote?symbol=${tdSyms}&apikey=${key}`);
    if (!r.ok) return null;
    const raw = await r.json();
    if (raw.status === "error") return null;
    const out = {};
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
    return Object.keys(out).length > 0 ? out : null;
  } catch { return null; }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST() {
  const tdKey = process.env.TWELVE_DATA_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  // Twelve Data full override when available
  if (tdKey) {
    const td = await fetchTwelveData(tdKey);
    if (td) return Response.json(td);
  }

  const out = {};

  // Run all sources in parallel
  const [
    stockQuotes,
    commodityQuotes,
    vix,
    indexGSPC,
    indexDJI,
    indexIXIC,
    bonds,
    fx,
    btc,
  ] = await Promise.all([
    // US Stocks: Finnhub or fallback Yahoo
    finnhubKey
      ? fetchFinnhubBatch(US_STOCKS, finnhubKey)
      : Promise.all(US_STOCKS.map(s => fetchYFQuote(s).then(d => ({ sym: s, d })))).then(arr => {
          const o = {};
          arr.forEach(({ sym, d }) => { if (d) o[sym] = d; });
          return o;
        }),

    // Commodities: Finnhub ETF proxies
    finnhubKey
      ? Promise.all(
          Object.entries(COMMODITY_ETF).map(async ([orig, etf]) => {
            const d = await fetchFinnhubQuote(etf, finnhubKey);
            return { orig, d };
          })
        ).then(arr => {
          const o = {};
          arr.forEach(({ orig, d }) => { if (d) o[orig] = d; });
          return o;
        })
      : Promise.resolve({}),

    // VIX: CBOE
    fetchVIX(),

    // Indices: Yahoo Finance v8
    fetchYFQuote("^GSPC"),
    fetchYFQuote("^DJI"),
    fetchYFQuote("^IXIC"),

    // Bonds: Treasury XML
    fetchTreasuryYields(),

    // FX: ExchangeRate-API
    fetchExchangeRates(),

    // BTC: CoinGecko
    fetchBTC(),
  ]);

  Object.assign(out, stockQuotes);
  Object.assign(out, commodityQuotes);
  if (vix) out["^VIX"] = vix;
  if (indexGSPC) out["^GSPC"] = indexGSPC;
  if (indexDJI)  out["^DJI"]  = indexDJI;
  if (indexIXIC) out["^IXIC"] = indexIXIC;
  Object.assign(out, bonds);
  Object.assign(out, fx);
  if (btc) out["BTC-USD"] = btc;

  return Response.json(out);
}
