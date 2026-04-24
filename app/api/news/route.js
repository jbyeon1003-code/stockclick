export const runtime = "edge";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

function parseNews(data) {
  const now = Date.now();
  return (data.news || []).slice(0, 6).map(n => {
    const pub = (n.providerPublishTime || 0) * 1000;
    const diff = now - pub;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const time = hours < 1 ? "방금 전" : hours < 24 ? `${hours}시간 전` : `${days}일 전`;
    return { title: n.title || "", url: n.link || "#", time, src: n.publisher || "" };
  });
}

export async function POST(request) {
  try {
    const { symbol } = await request.json();
    if (!symbol?.trim()) return Response.json([]);

    const sym = encodeURIComponent(symbol);

    // Try query1 then query2 as fallback
    const urls = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=${sym}&quotesCount=0&newsCount=6&enableFuzzyQuery=false`,
      `https://query2.finance.yahoo.com/v1/finance/search?q=${sym}&quotesCount=0&newsCount=6&enableFuzzyQuery=false`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        const news = parseNews(data);
        if (news.length > 0) return Response.json(news);
      } catch {
        continue;
      }
    }

    return Response.json([]);
  } catch (err) {
    console.error("[news]", err.message);
    return Response.json([]);
  }
}
