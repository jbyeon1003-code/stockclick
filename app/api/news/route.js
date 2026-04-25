export const runtime = "edge";

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

function formatRelativeTime(ts) {
  const diff = Date.now() - ts * 1000;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  return hours < 1 ? "방금 전" : hours < 24 ? `${hours}시간 전` : `${days}일 전`;
}

export async function POST(request) {
  try {
    const { symbol } = await request.json();
    if (!symbol?.trim()) return Response.json([]);

    // 1) Finnhub company news (if key available)
    const key = process.env.FINNHUB_API_KEY;
    if (key) {
      try {
        const to = new Date().toISOString().split("T")[0];
        const fromDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
        const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${to}&token=${key}`;
        const r = await fetch(url);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            const news = data.slice(0, 6).map(n => ({
              title: n.headline || "",
              url: n.url || "#",
              time: formatRelativeTime(n.datetime),
              src: n.source || "",
            }));
            return Response.json(news);
          }
        }
      } catch {}
    }

    // 2) Yahoo Finance fallback (query1 then query2)
    const sym = encodeURIComponent(symbol);
    const yfUrls = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=${sym}&quotesCount=0&newsCount=6&enableFuzzyQuery=false`,
      `https://query2.finance.yahoo.com/v1/finance/search?q=${sym}&quotesCount=0&newsCount=6&enableFuzzyQuery=false`,
    ];
    for (const url of yfUrls) {
      try {
        const res = await fetch(url, { headers: YF_HEADERS });
        if (!res.ok) continue;
        const data = await res.json();
        const news = (data.news || []).slice(0, 6).map(n => ({
          title: n.title || "",
          url: n.link || "#",
          time: formatRelativeTime(n.providerPublishTime || 0),
          src: n.publisher || "",
        }));
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
