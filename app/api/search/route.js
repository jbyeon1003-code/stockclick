export const runtime = "edge";

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) return Response.json([]);

    const key = process.env.FINNHUB_API_KEY;
    if (!key) return Response.json([]);

    const q = encodeURIComponent(query.trim());
    const r = await fetch(`https://finnhub.io/api/v1/search?q=${q}&token=${key}`);
    if (!r.ok) return Response.json([]);

    const data = await r.json();
    const results = (data.result ?? [])
      .filter(x => x.type === "Common Stock" || x.type === "ETP")
      .slice(0, 6)
      .map(x => ({
        ticker: x.symbol,
        name: x.description || x.symbol,
        exchange: x.displaySymbol || "",
      }));

    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
