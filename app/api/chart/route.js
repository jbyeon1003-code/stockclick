export const runtime = "edge";

const CFG = {
  "1W": { range: "5d",  iv: "1d" },
  "1M": { range: "1mo", iv: "1d" },
  "3M": { range: "3mo", iv: "1d" },
  "6M": { range: "6mo", iv: "1wk" },
  "1Y": { range: "1y",  iv: "1wk" },
  "2Y": { range: "2y",  iv: "1wk" },
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const sym = encodeURIComponent(symbol);

    // Try query1 then query2 as fallback
    const urls = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
        if (prices.length > 0) return Response.json({ prices });
      } catch {
        continue;
      }
    }

    return Response.json({ prices: [] });
  } catch {
    return Response.json({ prices: [] });
  }
}
