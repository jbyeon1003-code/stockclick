export const runtime = "edge";

const CFG = {
  "1W": { range: "5d",  iv: "1d",  days: 7   },
  "1M": { range: "1mo", iv: "1d",  days: 31  },
  "3M": { range: "3mo", iv: "1d",  days: 92  },
  "6M": { range: "6mo", iv: "1wk", days: 183 },
  "1Y": { range: "1y",  iv: "1wk", days: 365 },
  "2Y": { range: "2y",  iv: "1wk", days: 730 },
};

const YF_HDR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

function parseYFv8(data) {
  const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
  return prices.length > 0 ? prices : null;
}

function parseYFv7(data) {
  const closes = data.spark?.result?.[0]?.response?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
  return prices.length > 0 ? prices : null;
}

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const sym = encodeURIComponent(symbol);

    // 1) Yahoo Finance v8 (query1 then query2)
    for (const base of ["query1", "query2"]) {
      try {
        const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`;
        const res = await fetch(url, { headers: YF_HDR, cache: "no-store" });
        if (!res.ok) continue;
        const prices = parseYFv8(await res.json());
        if (prices) return Response.json({ prices });
      } catch { continue; }
    }

    // 2) Yahoo Finance v7 spark (query1 then query2)
    for (const base of ["query1", "query2"]) {
      try {
        const url = `https://${base}.finance.yahoo.com/v7/finance/spark?symbols=${sym}&range=${cfg.range}&interval=${cfg.iv}`;
        const res = await fetch(url, { headers: YF_HDR, cache: "no-store" });
        if (!res.ok) continue;
        const prices = parseYFv7(await res.json());
        if (prices) return Response.json({ prices });
      } catch { continue; }
    }

    return Response.json({ prices: [] });
  } catch {
    return Response.json({ prices: [] });
  }
}
