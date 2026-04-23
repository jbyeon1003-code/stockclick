const CFG = {
  "1W": { days: 7,   iv: "1d" },
  "1M": { days: 30,  iv: "1d" },
  "3M": { days: 90,  iv: "1d" },
  "6M": { days: 180, iv: "1wk" },
  "1Y": { days: 365, iv: "1wk" },
  "2Y": { days: 730, iv: "1wk" },
};

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const p1 = Math.floor((Date.now() - cfg.days * 864e5) / 1000);
    const p2 = Math.floor(Date.now() / 1000);

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=${cfg.iv}&includePrePost=false`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("[chart] HTTP", res.status, symbol);
      return Response.json({ prices: [] });
    }

    const data = await res.json();
    const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));

    return Response.json({ prices });
  } catch (err) {
    console.error("[chart]", err.message, symbol);
    return Response.json({ prices: [] });
  }
}
