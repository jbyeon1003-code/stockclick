export const runtime = "edge";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

export async function POST(request) {
  try {
    const { symbols } = await request.json();
    if (!symbols?.length) return Response.json({});

    const joined = symbols.map(s => encodeURIComponent(s)).join(",");
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${joined}&lang=en-US&region=US&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,trailingPE,epsTrailingTwelveMonths`;

    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return Response.json({});

    const data = await res.json();
    const list = data.quoteResponse?.result || [];

    const results = {};
    for (const q of list) {
      if (!q.regularMarketPrice) continue;
      results[q.symbol] = {
        price: q.regularMarketPrice,
        change: +(q.regularMarketChange || 0).toFixed(3),
        changePct: +(q.regularMarketChangePercent || 0).toFixed(3),
        mktCap: q.marketCap || null,
        pe: q.trailingPE || null,
        eps: q.epsTrailingTwelveMonths || null,
        pb: null,
        name: q.symbol,
      };
    }

    return Response.json(results);
  } catch {
    return Response.json({});
  }
}
