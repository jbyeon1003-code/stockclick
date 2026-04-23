export const runtime = "edge";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) return Response.json([]);

    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&lang=en-US`,
      { headers: HEADERS, cache: "no-store" }
    );

    if (!res.ok) return Response.json([]);
    const data = await res.json();

    const tickers = (data.quotes || [])
      .filter(q => q.symbol && q.quoteType !== "FUTURE" && q.quoteType !== "CURRENCY")
      .slice(0, 6)
      .map(q => ({
        ticker: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || "",
      }));

    return Response.json(tickers);
  } catch {
    return Response.json([]);
  }
}
