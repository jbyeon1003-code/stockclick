export const runtime = "edge";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Static fallback: popular US tickers for when Yahoo search is unavailable
const STATIC_TICKERS = [
  { ticker: "AAPL",  name: "Apple Inc.",                    exchange: "NASDAQ" },
  { ticker: "MSFT",  name: "Microsoft Corporation",         exchange: "NASDAQ" },
  { ticker: "GOOGL", name: "Alphabet Inc. (Class A)",       exchange: "NASDAQ" },
  { ticker: "AMZN",  name: "Amazon.com Inc.",               exchange: "NASDAQ" },
  { ticker: "META",  name: "Meta Platforms Inc.",           exchange: "NASDAQ" },
  { ticker: "NVDA",  name: "NVIDIA Corporation",            exchange: "NASDAQ" },
  { ticker: "TSLA",  name: "Tesla Inc.",                    exchange: "NASDAQ" },
  { ticker: "NFLX",  name: "Netflix Inc.",                  exchange: "NASDAQ" },
  { ticker: "ORCL",  name: "Oracle Corporation",            exchange: "NYSE"   },
  { ticker: "AMD",   name: "Advanced Micro Devices",        exchange: "NASDAQ" },
  { ticker: "INTC",  name: "Intel Corporation",             exchange: "NASDAQ" },
  { ticker: "QCOM",  name: "Qualcomm Incorporated",         exchange: "NASDAQ" },
  { ticker: "AVGO",  name: "Broadcom Inc.",                 exchange: "NASDAQ" },
  { ticker: "CRM",   name: "Salesforce Inc.",               exchange: "NYSE"   },
  { ticker: "ADBE",  name: "Adobe Inc.",                    exchange: "NASDAQ" },
  { ticker: "PYPL",  name: "PayPal Holdings Inc.",          exchange: "NASDAQ" },
  { ticker: "UBER",  name: "Uber Technologies Inc.",        exchange: "NYSE"   },
  { ticker: "ABNB",  name: "Airbnb Inc.",                   exchange: "NASDAQ" },
  { ticker: "SHOP",  name: "Shopify Inc.",                  exchange: "NYSE"   },
  { ticker: "SNOW",  name: "Snowflake Inc.",                exchange: "NYSE"   },
  { ticker: "PLTR",  name: "Palantir Technologies Inc.",    exchange: "NYSE"   },
  { ticker: "COIN",  name: "Coinbase Global Inc.",          exchange: "NASDAQ" },
  { ticker: "HOOD",  name: "Robinhood Markets Inc.",        exchange: "NASDAQ" },
  { ticker: "SQ",    name: "Block Inc.",                    exchange: "NYSE"   },
  { ticker: "V",     name: "Visa Inc.",                     exchange: "NYSE"   },
  { ticker: "MA",    name: "Mastercard Incorporated",       exchange: "NYSE"   },
  { ticker: "JPM",   name: "JPMorgan Chase & Co.",          exchange: "NYSE"   },
  { ticker: "GS",    name: "Goldman Sachs Group Inc.",      exchange: "NYSE"   },
  { ticker: "BAC",   name: "Bank of America Corporation",   exchange: "NYSE"   },
  { ticker: "WFC",   name: "Wells Fargo & Company",         exchange: "NYSE"   },
  { ticker: "BRK-B", name: "Berkshire Hathaway Inc. (B)",   exchange: "NYSE"   },
  { ticker: "JNJ",   name: "Johnson & Johnson",             exchange: "NYSE"   },
  { ticker: "PFE",   name: "Pfizer Inc.",                   exchange: "NYSE"   },
  { ticker: "UNH",   name: "UnitedHealth Group Inc.",       exchange: "NYSE"   },
  { ticker: "LLY",   name: "Eli Lilly and Company",         exchange: "NYSE"   },
  { ticker: "MRNA",  name: "Moderna Inc.",                  exchange: "NASDAQ" },
  { ticker: "BNTX",  name: "BioNTech SE",                   exchange: "NASDAQ" },
  { ticker: "DIS",   name: "The Walt Disney Company",       exchange: "NYSE"   },
  { ticker: "CMCSA", name: "Comcast Corporation",           exchange: "NASDAQ" },
  { ticker: "T",     name: "AT&T Inc.",                     exchange: "NYSE"   },
  { ticker: "VZ",    name: "Verizon Communications Inc.",   exchange: "NYSE"   },
  { ticker: "WMT",   name: "Walmart Inc.",                  exchange: "NYSE"   },
  { ticker: "COST",  name: "Costco Wholesale Corporation",  exchange: "NASDAQ" },
  { ticker: "TGT",   name: "Target Corporation",            exchange: "NYSE"   },
  { ticker: "HD",    name: "Home Depot Inc.",               exchange: "NYSE"   },
  { ticker: "NKE",   name: "Nike Inc.",                     exchange: "NYSE"   },
  { ticker: "MCD",   name: "McDonald's Corporation",        exchange: "NYSE"   },
  { ticker: "SBUX",  name: "Starbucks Corporation",         exchange: "NASDAQ" },
  { ticker: "BA",    name: "Boeing Company",                exchange: "NYSE"   },
  { ticker: "XOM",   name: "ExxonMobil Corporation",        exchange: "NYSE"   },
  { ticker: "CVX",   name: "Chevron Corporation",           exchange: "NYSE"   },
];

function staticSearch(query) {
  const q = query.trim().toUpperCase();
  return STATIC_TICKERS.filter(t =>
    t.ticker.includes(q) || t.name.toUpperCase().includes(q)
  ).slice(0, 6);
}

function parseYahooSearch(data) {
  return (data.quotes ?? [])
    .filter(x => x.symbol && x.quoteType !== "FUTURE" && x.quoteType !== "CURRENCY")
    .slice(0, 6)
    .map(x => ({ ticker: x.symbol, name: x.longname || x.shortname || x.symbol, exchange: x.exchDisp || x.exchange || "" }));
}

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) return Response.json([]);
    const q = encodeURIComponent(query.trim());

    const headers = {
      "User-Agent": UA,
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
    };

    // Try Yahoo Finance search (lighter endpoint, may still work on Edge)
    try {
      const [r1, r2] = await Promise.allSettled([
        fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&lang=en-US`, { headers, cache: "no-store" })
          .then(async r => r.ok ? parseYahooSearch(await r.json()) : []),
        fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&lang=en-US`, { headers, cache: "no-store" })
          .then(async r => r.ok ? parseYahooSearch(await r.json()) : []),
      ]);
      for (const res of [r1, r2]) {
        if (res.status === "fulfilled" && res.value?.length > 0) return Response.json(res.value);
      }
    } catch {}

    // Fallback: static ticker list
    const fallback = staticSearch(query);
    return Response.json(fallback);
  } catch {
    return Response.json([]);
  }
}
