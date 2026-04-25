export const runtime = "edge";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

// Yahoo Finance → Finnhub symbol mapping
// null means unsupported in Finnhub free tier
const SYMBOL_MAP = {
  "GC=F":      "OANDA:XAU_USD",   // Gold
  "CL=F":      "OANDA:BRENT_USD", // Crude Oil (Brent)
  "BTC-USD":   "BINANCE:BTCUSDT", // Bitcoin
  "USDKRW=X":  "OANDA:USD_KRW",   // USD/KRW
  "DX-Y.NYB":  null,              // Dollar Index — not in free tier
};

function toFinnhubSymbol(sym) {
  return Object.prototype.hasOwnProperty.call(SYMBOL_MAP, sym)
    ? SYMBOL_MAP[sym]
    : sym;
}

async function fetchQuote(symbol, apiKey) {
  const finnhubSym = toFinnhubSymbol(symbol);
  if (!finnhubSym) return null;

  try {
    const r = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(finnhubSym)}&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    const d = await r.json();
    // c === 0 means no data available for this symbol
    if (!d.c || d.c === 0) return null;
    return {
      price:     d.c,
      change:    +(d.d  ?? 0).toFixed(4),
      changePct: +(d.dp ?? 0).toFixed(4),
      high:      d.h,
      low:       d.l,
      open:      d.o,
      prevClose: d.pc,
    };
  } catch {
    return null;
  }
}

export async function POST(request) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "FINNHUB_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { symbols } = await request.json();
    if (!symbols?.length) return Response.json({});

    const settled = await Promise.all(
      symbols.map(async (sym) => ({ sym, data: await fetchQuote(sym, apiKey) }))
    );

    const out = {};
    for (const { sym, data } of settled) {
      if (data) out[sym] = data;
    }
    return Response.json(out);
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
