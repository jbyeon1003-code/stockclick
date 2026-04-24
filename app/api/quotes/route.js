export const runtime = "edge";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE = {
  "User-Agent": UA,
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
};

// Get Yahoo Finance crumb+cookie
// - fc.yahoo.com is deprecated (404); use finance.yahoo.com/quote/AAPL for cookie
// - query2 /v1/test/getcrumb returns 406; query1 works correctly
async function getAuth() {
  try {
    const r = await fetch("https://finance.yahoo.com/quote/AAPL", {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    const sc = r.headers.get("set-cookie");
    if (!sc) return null;
    const cookieStr = sc
      .split(/,(?=\s*[A-Za-z_][A-Za-z0-9_-]*\s*=)/)
      .map(c => c.trim().split(";")[0])
      .filter(Boolean)
      .join("; ");
    if (!cookieStr) return null;

    const cr = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...BASE, Cookie: cookieStr },
    });
    if (!cr.ok) return null;
    const crumb = (await cr.text()).trim();
    if (!crumb || crumb.length > 50 || crumb.includes("<") || crumb.includes("{")) return null;
    return { crumb, cookieStr };
  } catch {
    return null;
  }
}

// Fetch one symbol via v8 chart (no crumb required)
async function chartQuote(sym) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&includePrePost=false`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: BASE, cache: "no-store" });
      if (!r.ok) continue;
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
      const price = meta.regularMarketPrice;
      const change = +(price - prev).toFixed(4);
      const changePct = prev ? +((change / prev) * 100).toFixed(4) : 0;
      return { symbol: sym, price, change, changePct, mktCap: meta.marketCap ?? null };
    } catch {
      continue;
    }
  }
  return null;
}

function toQuote(q) {
  return {
    price: q.regularMarketPrice ?? q.price,
    change: +(q.regularMarketChange ?? q.change ?? 0).toFixed(3),
    changePct: +(q.regularMarketChangePercent ?? q.changePct ?? 0).toFixed(3),
    mktCap: q.marketCap ?? q.mktCap ?? null,
    pe: q.trailingPE ?? null,
    eps: q.epsTrailingTwelveMonths ?? null,
    pb: null,
    name: q.symbol ?? q.name,
  };
}

export async function POST(request) {
  try {
    const { symbols } = await request.json();
    if (!symbols?.length) return Response.json({});

    const joined = symbols.map(s => encodeURIComponent(s)).join(",");

    // Run auth + v8 chart queries in parallel
    const [auth, v8Settled] = await Promise.all([
      getAuth(),
      Promise.allSettled(symbols.map(chartQuote)),
    ]);

    // Attempt v7 bulk (richer: P/E, EPS, marketCap) — requires crumb
    try {
      const crumbQ = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";
      const extraH = auth?.cookieStr ? { Cookie: auth.cookieStr } : {};
      const v7Urls = [
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${joined}&lang=en-US&region=US&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,trailingPE,epsTrailingTwelveMonths${crumbQ}`,
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}&lang=en-US&region=US&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,trailingPE,epsTrailingTwelveMonths${crumbQ}`,
      ];
      for (const url of v7Urls) {
        const r = await fetch(url, { headers: { ...BASE, ...extraH }, cache: "no-store" });
        if (!r.ok) continue;
        const d = await r.json();
        const list = d.quoteResponse?.result ?? [];
        if (list.length > 0) {
          const out = {};
          for (const q of list) {
            if (q.regularMarketPrice) out[q.symbol] = toQuote(q);
          }
          if (Object.keys(out).length > 0) return Response.json(out);
        }
      }
    } catch {}

    // Fallback: use already-completed v8 chart results
    const out = {};
    for (const r of v8Settled) {
      if (r.status === "fulfilled" && r.value) {
        const v = r.value;
        out[v.symbol] = toQuote({ ...v, regularMarketPrice: v.price, regularMarketChange: v.change, regularMarketChangePercent: v.changePct, marketCap: v.mktCap, symbol: v.symbol });
      }
    }
    return Response.json(out);
  } catch {
    return Response.json({});
  }
}
