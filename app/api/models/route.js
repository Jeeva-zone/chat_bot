// Optional server-side loader for a remote models.json (avoids browser CORS
// when the user points the app at a config hosted somewhere else).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return Response.json({ error: "Missing ?url=" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Only http(s) URLs are allowed." }, { status: 400 });
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch models.json (HTTP ${res.status})` },
        { status: 502 }
      );
    }
    const json = await res.json();
    return Response.json(json);
  } catch (err) {
    return Response.json(
      { error: `Failed to fetch models.json: ${err?.message || "network error"}` },
      { status: 502 }
    );
  }
}
