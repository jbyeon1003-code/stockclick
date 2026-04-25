export const runtime = "edge";

// Yahoo Finance symbol → Stooq symbol
// Stooq CSV format: symbol,date,time,open,high,low,close,volume,name,prev_close
// Fields: f=sd2t2ohlcvnp
const SYM_MAP = {
  "^GSPC": "^spx",
  "^DJI": "^dji",
  "^IXIC": "^ndx",       // Nasdaq 100 (Composite not available in Stooq)
  "GC=F": "gc.f",        // Gold futures
  "CL=F": "cl.f",        // Crude Oil WTI
  "SI=F": "si.f",        // Silver futures
  "NG=F": "ng.f",        // Natural gas futures
  "HG=F": "hg.f",        // Copper futures
  "BTC-USD": "btc.v",    // Bitcoin
  "ETH-USD": "eth.v",    // Ethereum
  "DX-Y.NYB": "dx.f",    // US Dollar Index
  "USDKRW=X": "usdkrw",  // USD/KRW
  "USDJPY=X": "usdjpy",  // USD/JPY
  "EURUSD=X": "eurusd",  // EUR/USD
  // No Stooq equivalent — will return null → UI shows "--"
  "^VIX": null,
  "^TNX": null,
  "^IRX": null,
  "^TYX": null,
};

function toStooqSym(sym) {
  if (Object.prototype.hasOwnProperty.call(SYM_MAP, sym)) return SYM_MAP[sym];
  // Standard US stock tickers (1–5 uppercase letters, no special chars)
  if (/^[A-Z]{1,5}$/.test(sym)) return sym.toLowerCase() + ".us";
  return null;
}

async function fetchQuote(yahooSym) {
  const stooqSym = toStooqSym(yahooSym);
  if (!stooqSym) return null;

  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSym)}&f=sd2t2ohlcvnp`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;

    const text = (await r.text()).trim();
    if (!text || text.includes("N/D")) return null;

    // CSV: symbol,date,time,open,high,low,close,volume,name,prev_close
    const parts = text.split(",");
    if (parts.length < 10) return null;

    const close = parseFloat(parts[6]);
    const prevClose = parseFloat(parts[9]);
    if (!close || !prevClose || isNaN(close) || isNaN(prevClose)) return null;

    const change = +(close - prevClose).toFixed(4);
    const changePct = +((change / prevClose) * 100).toFixed(4);

    return { price: close, change, changePct, mktCap: null, pe: null, eps: null };
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const { symbols } = await request.json();
    if (!symbols?.length) return Response.json({});

    const settled = await Promise.allSettled(
      symbols.map(sym => fetchQuote(sym).then(q => ({ sym, q })))
    );

    const out = {};
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value?.q) {
        out[r.value.sym] = r.value.q;
      }
    }
    return Response.json(out);
  } catch {
    return Response.json({});
  }
}
