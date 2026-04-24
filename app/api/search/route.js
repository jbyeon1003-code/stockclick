export const runtime = "edge";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseV1(data) {
  return (data.quotes ?? [])
    .filter(x => x.symbol && x.quoteType !== "FUTURE" && x.quoteType !== "CURRENCY")
    .slice(0, 6)
    .map(x => ({ ticker: x.symbol, name: x.longname || x.shortname || x.symbol, exchange: x.exchDisp || x.exchange || "" }));
}

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) return Response.json([]);
    const q = encodeURIComponent(query.trim());

    const headers = {
      "User-Agent": UA,
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
      "Origin": "https://finance.yahoo.com",
    };

    // autoc.finance.yahoo.com returns HTML error pages — removed
    // Try query1 and query2 in parallel; return first non-empty result
    const [q1, q2] = await Promise.allSettled([
      fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&lang=en-US`,
        { headers, cache: "no-store" }
      ).then(async r => (r.ok ? parseV1(await r.json()) : [])),

      fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&lang=en-US`,
        { headers, cache: "no-store" }
      ).then(async r => (r.ok ? parseV1(await r.json()) : [])),
    ]);

    for (const res of [q1, q2]) {
      if (res.status === "fulfilled" && res.value?.length > 0) return Response.json(res.value);
    }
    return Response.json([]);
  } catch {
    return Response.json([]);
  }
}
