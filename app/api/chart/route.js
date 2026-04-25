export const runtime = "edge";

const PERIODS = {
  "1W": { range: "5d",  iv: "1d",   tdInterval: "1day",  tdOutputsize: 7  },
  "1M": { range: "1mo", iv: "1d",   tdInterval: "1day",  tdOutputsize: 30 },
  "3M": { range: "3mo", iv: "1d",   tdInterval: "1day",  tdOutputsize: 90 },
  "6M": { range: "6mo", iv: "1wk",  tdInterval: "1week", tdOutputsize: 26 },
  "1Y": { range: "1y",  iv: "1wk",  tdInterval: "1week", tdOutputsize: 52 },
  "2Y": { range: "2y",  iv: "1wk",  tdInterval: "1week", tdOutputsize: 104 },
};

// Yahoo Finance symbol → Twelve Data symbol
const TD_SYM_MAP = {
  "^GSPC": "SPX",    "^DJI": "DJI",    "^IXIC": "IXIC",
  "^VIX": "VIX",     "^TNX": "TNX",
  "GC=F": "XAU/USD", "CL=F": "WTI/USD","SI=F": "XAG/USD",
  "BTC-USD": "BTC/USD", "ETH-USD": "ETH/USD",
  "DX-Y.NYB": "DXY", "USDKRW=X": "USD/KRW", "USDJPY=X": "USD/JPY",
};

function toTdSym(sym) {
  return TD_SYM_MAP[sym] ?? sym;
}

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

async function chartFromTwelveData(symbol, cfg) {
  const key = (typeof process !== "undefined" && process.env?.TWELVE_DATA_KEY) || "";
  if (!key) return null;

  try {
    const tdSym = encodeURIComponent(toTdSym(symbol));
    const url = `https://api.twelvedata.com/time_series?symbol=${tdSym}&interval=${cfg.tdInterval}&outputsize=${cfg.tdOutputsize}&apikey=${key}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status === "error" || !d.values?.length) return null;
    // Twelve Data returns newest-first; reverse for chronological order
    return d.values.map(v => +parseFloat(v.close).toFixed(2)).reverse();
  } catch {
    return null;
  }
}

async function chartFromYahoo(symbol, cfg) {
  const sym = encodeURIComponent(symbol);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: YF_HEADERS, cache: "no-store" });
      if (!r.ok) continue;
      const data = await r.json();
      const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
      if (prices.length > 0) return prices;
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = PERIODS[period] ?? PERIODS["3M"];

    // Prefer Twelve Data if API key is configured; fall back to Yahoo Finance v8
    const prices =
      (await chartFromTwelveData(symbol, cfg)) ??
      (await chartFromYahoo(symbol, cfg)) ??
      [];

    return Response.json({ prices });
  } catch {
    return Response.json({ prices: [] });
  }
}
