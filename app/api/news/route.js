export async function POST(request) {
  try {
    const { symbol } = await request.json();
    if (!symbol?.trim()) return Response.json([]);

    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=6&enableFuzzyQuery=false`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return Response.json([]);
    const data = await res.json();

    const now = Date.now();
    const news = (data.news || []).slice(0, 6).map(n => {
      const pub = (n.providerPublishTime || 0) * 1000;
      const diff = now - pub;
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      const time = hours < 1 ? "방금 전" : hours < 24 ? `${hours}시간 전` : `${days}일 전`;
      return {
        title: n.title || "",
        url: n.link || "#",
        time,
        src: n.publisher || "",
      };
    });

    return Response.json(news);
  } catch (err) {
    console.error("[news]", err.message);
    return Response.json([]);
  }
}
