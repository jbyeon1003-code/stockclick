export const runtime = "edge";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

// Period → { resolution, days }
// Finnhub resolution: D=daily, W=weekly, M=monthly
const PERIOD_CFG = {
  "1W": { resolution: "D", days: 7   },
  "1M": { resolution: "D", days: 30  },
  "3M": { resolution: "D", days: 90  },
  "6M": { resolution: "W", days: 180 },
  "1Y": { resolution: "W", days: 365 },
  "2Y": { resolution: "W", days: 730 },
};

// Candle endpoint to use per symbol type
//   "stock"  → /stock/candle   (stocks, indices like ^GSPC)
//   "forex"  → /forex/candle   (OANDA pairs)
//   "crypto" → /crypto/candle  (BINANCE: etc.)
//   null     → not supported, return empty
const SYMBOL_CANDLE_TYPE = {
  "GC=F":     { endpoint: "forex",  sym: "OANDA:XAU_USD"   }, // Gold
  "CL=F":     { endpoint: "forex",  sym: "OANDA:BRENT_USD" }, // Crude Oil
  "BTC-USD":  { endpoint: "crypto", sym: "BINANCE:BTCUSDT" }, // Bitcoin
  "USDKRW=X": { endpoint: "forex",  sym: "OANDA:USD_KRW"   }, // USD/KRW
  "DX-Y.NYB": null,                                            // Dollar Index — unsupported
};

function getCandleInfo(symbol) {
  if (Object.prototype.hasOwnProperty.call(SYMBOL_CANDLE_TYPE, symbol)) {
    return SYMBOL_CANDLE_TYPE[symbol]; // may be null
  }
  // Default: treat as stock (covers AAPL, ^GSPC, ^VIX, ^TNX, etc.)
  return { endpoint: "stock", sym: symbol };
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
    const { symbol, period } = await request.json();
    const cfg = PERIOD_CFG[period] ?? PERIOD_CFG["1M"];

    const info = getCandleInfo(symbol);
    if (!info) return Response.json({ prices: [] });

    const now  = Math.floor(Date.now() / 1000);
    const from = now - cfg.days * 86400;

    const url = `${FINNHUB_BASE}/${info.endpoint}/candle?symbol=${encodeURIComponent(info.sym)}&resolution=${cfg.resolution}&from=${from}&to=${now}&token=${apiKey}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return Response.json({ prices: [] });

    const data = await r.json();
    // data.s === "ok" when data is available; "no_data" otherwise
    if (data.s !== "ok" || !data.c?.length) return Response.json({ prices: [] });

    const prices = data.c.map((v) => +v.toFixed(2));
    return Response.json({ prices });
  } catch {
    return Response.json({ prices: [] });
  }
}
