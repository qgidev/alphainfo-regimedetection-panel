# CORS fix for the alphainfo FastAPI backend

This is a reference patch. The fix lives here, in the plugin repo, so the
plugin side has a single record of every remote-side change it depends on.
Apply it to the **alphainfo backend repo** — the file that hosts the
FastAPI app (`api/app.py` in `qgidev/alphainfo`) — then Railway will
auto-deploy on push.

The plugin cannot work in a browser without this fix.

---

## The bug

`api/app.py` around lines 515-530 of the alphainfo backend has this logic:

```python
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
_env = (os.getenv("ENV") or os.getenv("ENVIRONMENT", "development")).lower()
if _cors_origins:
    _origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]
elif _env in ("production", "prod"):
    _origins_list = []              # ← the bug
else:
    _origins_list = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins_list,
    allow_credentials=True,          # ← also wrong for this API
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)
```

When Railway runs the app with `ENV=production` and no `CORS_ORIGINS`
env var set, `_origins_list` falls back to `[]`. Starlette's CORSMiddleware
with an empty origin list + `allow_credentials=True` refuses to emit
`Access-Control-Allow-Origin` for any origin other than the same-origin
bypass — so every cross-origin request (including Grafana at
`http://localhost:3000`) is rejected with `HTTP 400` and no ACAO header.

This was verified by probe:

```
$ curl -sS -D - -X OPTIONS -o /dev/null \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-api-key" \
  https://www.alphainfo.io/v1/analyze/stream | grep -i access-control

HTTP/2 400
access-control-allow-credentials: true
access-control-allow-headers: ...
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-max-age: 600
# ← no access-control-allow-origin
```

---

## The fix

Replace the block with:

```python
# CORS middleware (configurável por env; default permissivo para API pública)
#
# IMPORTANTE: `allow_credentials` deve ser False quando `allow_origins=["*"]` —
# a spec CORS proíbe a combinação e o Starlette silenciosamente recusa-se a
# emitir `Access-Control-Allow-Origin`. A API autentica via header `X-API-Key`,
# que o browser não trata como credencial (credenciais = cookies + HTTP auth),
# portanto credentials=False é seguro e correto.
#
# Pra restringir origens (ex.: dashboard interno que usa session cookies),
# definir `CORS_ORIGINS=https://www.alphainfo.io,https://alphainfo.io` no env
# e combinar com CORS_ALLOW_CREDENTIALS=true. Padrão aqui prioriza o caso de
# uso principal: plugin Grafana de qualquer origem chamando a API com X-API-Key.
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
_cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None
_cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
if _cors_origins:
    _origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]
else:
    _origins_list = ["*"]  # público por default; X-API-Key é o gate de autz
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins_list,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=_cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After",
    ],
    max_age=600,
)
```

Three behavioral changes:

1. **Default `allow_origins=["*"]` in every environment** (no more empty
   list in production). Safe because credentials are off by default.
2. **`allow_credentials` defaults to `False`**, configurable via
   `CORS_ALLOW_CREDENTIALS=true` if a future dashboard route needs cookies.
3. **`expose_headers` + `max_age`** added so rate-limit headers are visible
   to JS clients and preflights cache for 10 minutes.

Zero impact on authentication — this API uses `X-API-Key` (header), which
browsers do not treat as a credential. Confirmed by grep: zero occurrences
of `session`, `cookie`, `JWT`, `HTTPOnly`, or `set_cookie` in the backend
code at the time of writing.

---

## Verification

**1. Local smoke-test before deploying.** Save this as `cors_test.py`,
run with `uvicorn`, and probe from another origin:

```python
# cors_test.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
    max_age=600,
)

@app.get("/health")
def health(): return {"status": "healthy"}
```

```
$ uvicorn cors_test:app --port 8902 &
$ curl -sS -D - -X OPTIONS -o /dev/null \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-api-key" \
  http://127.0.0.1:8902/health | grep -i access-control

HTTP/1.1 200 OK
access-control-allow-origin: *
access-control-allow-methods: GET, POST, OPTIONS
access-control-max-age: 600
access-control-allow-headers: Content-Type, X-API-Key, Authorization
```

The `access-control-allow-origin: *` line is the new success criterion.

**2. After Railway deploys.** Probe production:

```
$ curl -sS -D - -X OPTIONS -o /dev/null \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-api-key" \
  https://www.alphainfo.io/v1/analyze/stream | grep -i access-control
```

Expect `access-control-allow-origin: *` (and no longer
`access-control-allow-credentials: true`).

**3. Open the plugin.** With the Grafana dev container up
(`docker compose up` in this repo, port 3100 by default) paste the API
key into a panel and watch the overlay render against a live series.

---

## Required for the in-UI quota indicator

The plugin footer shows `Quota N / Y · checked Ns ago` when the API
returns `X-RateLimit-Limit` and `X-RateLimit-Remaining` **and** the CORS
response exposes them to the browser. Without the `expose_headers` entry
below, the browser hides the headers from the plugin's `fetch()`
response object and the quota line stays invisible — even though the
server includes the headers in the raw HTTP response.

Verified on 2026-04-19: the current alphainfo backend sends the
`x-ratelimit-*` headers but does **not** emit
`access-control-expose-headers`, so the quota indicator never displays
in the plugin. The one-line fix is the `expose_headers` entry in the
`add_middleware` call shown above.

Minimum patch to enable quota visibility:

```python
app.add_middleware(
    CORSMiddleware,
    # ...existing allow_origins / allow_methods / allow_headers...
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After",
    ],
)
```

Safe to add on its own — `expose_headers` only *reveals* response
headers that the server is already sending; it does not change auth
behavior and does not interact with `allow_credentials`.

## Environment overrides (for future deployments)

| Env var | Default | Purpose |
|---|---|---|
| `CORS_ORIGINS` | unset → `["*"]` | CSV of explicit origins. When set, replaces the `["*"]` default. |
| `CORS_ORIGIN_REGEX` | unset | Passed to Starlette as `allow_origin_regex`. Useful for matching localhost on any port. |
| `CORS_ALLOW_CREDENTIALS` | `false` | Set to `true` only if a future endpoint needs session cookies. Incompatible with `allow_origins=["*"]` — combine with explicit `CORS_ORIGINS`. |

---

## Rollback

If the fix breaks something unexpected, the one-liner is:

```
git revert <commit-sha> && git push origin main
```

Railway will redeploy with the old config automatically.
