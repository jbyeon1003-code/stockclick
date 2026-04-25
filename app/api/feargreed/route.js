export const runtime = "edge";

export async function GET() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=365", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (!data.data || data.data.length === 0) throw new Error("empty");

    const arr = data.data;
    return Response.json({
      value: parseInt(arr[0].value),
      label: arr[0].value_classification,
      prev: arr[1] ? parseInt(arr[1].value) : null,
      weekAgo: arr[7] ? parseInt(arr[7].value) : null,
      monthAgo: arr[30] ? parseInt(arr[30].value) : null,
      yearAgo: arr[364] ? parseInt(arr[364].value) : null,
    });
  } catch {
    return Response.json(null);
  }
}
