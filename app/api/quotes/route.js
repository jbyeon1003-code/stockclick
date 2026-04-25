export const runtime = "edge";

const SYMBOLS = ["AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","NFLX","ORCL","AMD","^GSPC","^DJI","^IXIC","^VIX","GC=F","CL=F","SI=F","NG=F","HG=F","BTC-USD","^IRX","^TNX","^TYX","DX-Y.NYB","USDKRW=X"];

const MAP = {
  "GC=F": "OANDA:XAU_USD",
  "CL=F": "OANDA:BRENT_USD",
  "SI=F": "OANDA:XAG_USD",
  "BTC-USD": "BINANCE:BTCUSDT",
  "USDKRW=X": "OANDA:USD_KRW",
};

export async function POST() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return Response.json({});

  const results = await Promise.all(SYMBOLS.map(async sym => {
    const fSym = MAP.hasOwnProperty(sym) ? MAP[sym] : sym;
    if (!fSym) return [sym, null];

    let endpoint;
    if (fSym.includes("OANDA:")) {
      endpoint = `https://finnhub.io/api/v1/forex/candle?symbol=${fSym}&resolution=D&count=2&token=${key}`;
    } else if (fSym.includes("BINANCE:")) {
      endpoint = `https://finnhub.io/api/v1/crypto/candle?symbol=${fSym}&resolution=D&count=2&token=${key}`;
    } else {
      endpoint = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(fSym)}&token=${key}`;
    }

    try {
      const r = await fetch(endpoint);
      const d = await r.json();
      if (fSym.includes("OANDA:") || fSym.includes("BINANCE:")) {
        if (!d.c || d.c.length < 2) return [sym, null];
        const price = d.c[d.c.length - 1];
        const prev = d.c[d.c.length - 2];
        const change = +(price - prev).toFixed(2);
        const changePct = +(change / prev * 100).toFixed(2);
        return [sym, { price, change, changePct }];
      } else {
        if (!d.c) return [sym, null];
        return [sym, { price: d.c, change: +(d.d || 0).toFixed(2), changePct: +(d.dp || 0).toFixed(2) }];
      }
    } catch {
      return [sym, null];
    }
  }));

  const out = {};
  results.forEach(([sym, data]) => { if (data) out[sym] = data; });
  return Response.json(out);
}
