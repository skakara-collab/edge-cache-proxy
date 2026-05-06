const UPSTREAM_API = "https://jsonplaceholder.typicode.com";
const CACHE_TTL = 60; // seconds to cache responses

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Only GET requests are supported" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Block requests with no path (just hitting the root)
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          message: "Edge Cache Proxy",
          usage: "Append any JSONPlaceholder path. e.g. /posts, /posts/1, /users",
          example: `${url.origin}/posts/1`,
          upstream: UPSTREAM_API,
          cache_ttl_seconds: CACHE_TTL,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Build upstream URL
    const upstreamURL = `${UPSTREAM_API}${url.pathname}${url.search}`;

    // Check Cloudflare's edge cache first
    const cache = caches.default;
    const cacheKey = new Request(upstreamURL);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      // Cache HIT — clone and add our header
      const headers = new Headers(cachedResponse.headers);
      headers.set("X-Cache-Status", "HIT");
      headers.set("X-Proxy-By", "edge-cache-proxy");
      headers.set("Access-Control-Allow-Origin", "*");

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers,
      });
    }

    // Cache MISS — fetch from upstream
    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamURL, {
        headers: { "Accept": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to reach upstream API" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!upstreamResponse.ok) {
      return new Response(JSON.stringify({ error: "Upstream API error", status: upstreamResponse.status }), {
        status: upstreamResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build response to cache and return
    const responseToCache = new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
        "X-Cache-Status": "MISS",
        "X-Proxy-By": "edge-cache-proxy",
        "X-Upstream": UPSTREAM_API,
        "Access-Control-Allow-Origin": "*",
      },
    });

    // Store in edge cache (non-blocking)
    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

    return responseToCache;
  },
} satisfies ExportedHandler<Env>;