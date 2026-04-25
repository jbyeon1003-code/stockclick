export const runtime = "edge";

const CFG = {
  "1W": { resolution: "D", days: 7 },
  "1M": { resolution: "D", days: 31 },
  "3M": { resolution: "D", days: 92 },
  "6M": { resolution: "D", days: 183 },
  "1Y": { resolution: "W", days: 365 },
  "2Y": { resolution: "W", days: 730 },
};

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return Response.json({ prices: [] });

    const cfg = CFG[period] || CFG["3M"];
    const to = Math.floor(Date.now() / 1000);
    const from = to - cfg.days * 24 * 60 * 60;

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${cfg.resolution}&from=${from}&to=${to}&token=${key}`;
    const r = await fetch(url);
    if (!r.ok) return Response.json({ prices: [] });

    const d = await r.json();
    if (!d.c || d.s === "no_data") return Response.json({ prices: [] });

    const prices = d.t.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      close: +d.c[i].toFixed(2),
      open: +d.o[i].toFixed(2),
      high: +d.h[i].toFixed(2),
      low: +d.l[i].toFixed(2),
      volume: d.v[i],
    }));

    return Response.json({ prices });
  } catch {
    return Response.json({ prices: [] });
  }
}
