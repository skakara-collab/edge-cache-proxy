# Edge Cache Proxy

A Cloudflare Worker that sits in front of any public API and caches responses at the edge — serving cached content in milliseconds without hitting the upstream server.

## Live Demo

```
https://edge-cache-proxy.skakara.workers.dev/posts/1
https://edge-cache-proxy.skakara.workers.dev/users
https://edge-cache-proxy.skakara.workers.dev/posts
```

## How It Works

```
Browser → Cloudflare Edge (Worker) → Cache HIT? → Return instantly
                                    → Cache MISS? → Fetch upstream → Cache → Return
```

1. Request hits Cloudflare's edge network (330+ cities worldwide)
2. Worker checks the edge cache for the requested URL
3. **Cache HIT** — response served instantly, no upstream call
4. **Cache MISS** — fetches from upstream API, stores in edge cache for 60 seconds, returns response

## Response Headers

Every response includes custom headers so you can inspect caching behaviour:

| Header | Value | Meaning |
|---|---|---|
| `X-Cache-Status` | `HIT` or `MISS` | Whether response came from cache |
| `X-Proxy-By` | `edge-cache-proxy` | Identifies this worker |
| `X-Upstream` | upstream URL | Origin API being proxied |
| `Cache-Control` | `public, max-age=60` | Cache TTL in seconds |

## Try It

```bash
# First request — MISS (fetches from upstream)
curl -I https://edge-cache-proxy.skakara.workers.dev/posts/1

# Second request — HIT (served from edge cache)
curl -I https://edge-cache-proxy.skakara.workers.dev/posts/1
```

## Tech Stack

- **Cloudflare Workers** — serverless edge compute
- **Cloudflare Cache API** — edge caching
- **TypeScript**
- **Wrangler CLI** — deployment

## Run Locally

```bash
npm install
npm run dev
# Visit http://127.0.0.1:8787
```

## Deploy

```bash
npm run deploy
```

## Supported Endpoints

Any GET endpoint from [JSONPlaceholder](https://jsonplaceholder.typicode.com):

```
/posts         /posts/1
/users         /users/1
/comments      /todos
```