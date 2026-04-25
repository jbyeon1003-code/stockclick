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

const STOOQ_MAP = {
  "^GSPC": "^spx", "^IXIC": "^ndq", "^DJI": "^dji", "^VIX": "^vix",
  "GC=F": "gc.f", "CL=F": "cl.f", "BTC-USD": "btc.v", "USDKRW=X": "usdkrw",
};

function stooqSym(s) { return STOOQ_MAP[s] || s.toLowerCase(); }

function fmtDate(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function parseYF(data) {
  const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const prices = closes.filter(v => v != null).map(v => +v.toFixed(2));
  return prices.length > 0 ? prices : null;
}

export async function POST(request) {
  try {
    const { symbol, period } = await request.json();
    const cfg = CFG[period] || CFG["3M"];
    const sym = encodeURIComponent(symbol);

    // 1) Yahoo Finance v8 with crumb auth
    try {
      const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
        headers: YF_HDR, cache: "no-store",
      });
      if (crumbRes.ok) {
        const crumb = await crumbRes.text();
        if (crumb && !crumb.includes("<") && crumb.length < 50) {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false&crumb=${encodeURIComponent(crumb)}`;
          const res = await fetch(url, { headers: YF_HDR, cache: "no-store" });
          if (res.ok) {
            const prices = parseYF(await res.json());
            if (prices) return Response.json({ prices });
          }
        }
      }
    } catch {}

    // 2) Yahoo Finance v8 without auth (query1 then query2)
    for (const base of ["query1", "query2"]) {
      try {
        const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${sym}?range=${cfg.range}&interval=${cfg.iv}&includePrePost=false`;
        const res = await fetch(url, { headers: YF_HDR, cache: "no-store" });
        if (!res.ok) continue;
        const prices = parseYF(await res.json());
        if (prices) return Response.json({ prices });
      } catch { continue; }
    }

    // 3) Stooq CSV fallback
    try {
      const ss = stooqSym(symbol);
      const today = new Date();
      const from = new Date(today.getTime() - cfg.days * 86400000);
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(ss)}&d1=${fmtDate(from)}&d2=${fmtDate(today)}&i=d`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const csv = await res.text();
        const prices = csv.trim().split("\n").slice(1)
          .filter(l => l.trim() && !l.includes("No data"))
          .map(l => parseFloat(l.split(",")[4]))
          .filter(v => !isNaN(v))
          .map(v => +v.toFixed(2));
        if (prices.length > 0) return Response.json({ prices });
      }
    } catch {}

    return Response.json({ prices: [] });
  } catch {
    return Response.json({ prices: [] });
  }
}
