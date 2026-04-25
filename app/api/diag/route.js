export const runtime = "edge";

export async function GET() {
  const results = {};
  const key = "d7etfhhr01qi33g7jflgd7etfhhr01qi33g7jfm0";

  await Promise.all([
    // Finnhub
    (async () => {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`, { cache: "no-store" });
        const d = await r.json();
        results.finnhub = { ok: !!d.c, price: d.c, status: r.status };
      } catch(e) { results.finnhub = { ok: false, error: e.message }; }
    })(),

    // Stooq
    (async () => {
      try {
        const r = await fetch("https://stooq.com/q/d/l/?s=aapl.us&i=d", { cache: "no-store" });
        const text = await r.text();
        results.stooq = { ok: r.ok, status: r.status, preview: text.slice(0, 100) };
      } catch(e) { results.stooq = { ok: false, error: e.message }; }
    })(),

    // CBOE VIX
    (async () => {
      try {
        const r = await fetch("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv", { cache: "no-store" });
        const text = await r.text();
        results.cboe = { ok: r.ok, status: r.status, preview: text.slice(0, 80) };
      } catch(e) { results.cboe = { ok: false, error: e.message }; }
    })(),

    // CoinGecko
    (async () => {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true", { cache: "no-store" });
        const d = await r.json();
        results.coingecko = { ok: !!d.bitcoin?.usd, price: d.bitcoin?.usd, status: r.status };
      } catch(e) { results.coingecko = { ok: false, error: e.message }; }
    })(),

    // Twelve Data
    (async () => {
      const tdKey = process.env.TWELVE_DATA_API_KEY;
      if (!tdKey) { results.twelvedata = { ok: false, error: "no key" }; return; }
      try {
        const r = await fetch(`https://api.twelvedata.com/quote?symbol=AAPL&apikey=${tdKey}`, { cache: "no-store" });
        const d = await r.json();
        results.twelvedata = { ok: !!d.close, price: d.close, status: r.status };
      } catch(e) { results.twelvedata = { ok: false, error: e.message }; }
    })(),
  ]);

  return Response.json(results);
}
