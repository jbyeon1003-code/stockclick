export const runtime = "edge";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export async function POST(request) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "FINNHUB_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { query } = await request.json();
    if (!query?.trim()) return Response.json([]);

    const r = await fetch(
      `${FINNHUB_BASE}/search?q=${encodeURIComponent(query.trim())}&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!r.ok) return Response.json([]);

    const data = await r.json();
    // { result: [{ symbol, description, type, displaySymbol }] }
    const results = (data.result ?? [])
      .filter((x) => x.type === "Common Stock" || x.type === "ETP")
      .slice(0, 6)
      .map((x) => ({
        ticker:   x.symbol,
        name:     x.description,
        exchange: x.type,
      }));

    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
