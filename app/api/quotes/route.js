async function fetchOne(sym) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error("no price");

  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = +(price - prev).toFixed(3);
  const changePct = prev ? +((change / prev) * 100).toFixed(3) : 0;

  return {
    price,
    change,
    changePct,
    mktCap: meta.marketCap ?? null,
    pe: meta.trailingPE ?? null,
    eps: meta.epsTrailingTwelveMonths ?? null,
    pb: null,
    name: sym,
  };
}

export async function POST(request) {
  try {
    const { symbols } = await request.json();

    const settled = await Promise.allSettled(
      symbols.map(sym => fetchOne(sym).then(data => ({ sym, data })))
    );

    const results = {};
    settled.forEach(r => {
      if (r.status === "fulfilled") {
        results[r.value.sym] = r.value.data;
      } else {
        console.error("[quotes]", r.reason?.message);
      }
    });

    return Response.json(results);
  } catch (err) {
    console.error("[quotes]", err.message);
    return Response.json({});
  }
}
