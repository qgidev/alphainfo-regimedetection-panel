# AlphaInfo Regime Detection — Grafana Panel Plugin

**See the regime change before a fixed threshold fires.**

Fixed-threshold alerts either fire too often (noise) or miss the real
change — alert fatigue was the #1 obstacle to faster incident response in
Grafana's 2026 Observability Survey (30% of 1,363 respondents, nearly
double the next answer). This panel takes the series already on your
dashboard, sends it to the [alphainfo](https://alphainfo.io) structural
analysis API, and answers a different question than a threshold does:
**did the structure of this signal change?**

- **Verdict badge** — `STABLE` / `TRANSITION` / `UNSTABLE`, the structural
  score, and the semantic alert level, at a glance.
- **Regime overlay** — a colored frame on the chart naming the current band.
- **Deep mode (optional)** — slices the visible window into 2–10 segments
  and analyzes each one, rendering a timeline of **where** the change
  happened, with the most divergent window marked.
- **Quota footer** — live `remaining / limit` from the API's rate-limit
  headers, with the per-run cost always spelled out before you spend it.

Works with any data source that returns a numeric time series: Prometheus,
InfluxDB, Loki metrics, TestData, SQL, …

## Quick start

1. Add an **AlphaInfo Regime Detection** panel to a dashboard.
2. Get a free API key at
   [alphainfo.io/register](https://alphainfo.io/register) — 50 analyses per
   month, no credit card.
3. Paste it under **Panel options → Authentication**.
4. Click **Analyze now**.

By default the panel only analyzes when you click — one click, one analysis
(plus one per deep-mode window when enabled). The free plan lasts months
this way. For continuous monitoring, switch on **Quota → Re-analyze on
dashboard refresh** and size your plan for it:

| Usage pattern | Analyses/month | Suggested plan |
| --- | --- | --- |
| On-demand clicks only | tens | Free ($0) |
| 1 panel, hourly refresh | ~720 | Starter ($49) |
| 1 panel, 5-min refresh | ~8,600 | Growth ($199) |
| 5 panels, 5-min refresh | ~43,000 | Professional ($499) |

When quota runs low the footer shows an upgrade link; on HTTP 429 the panel
explains the plan limit and offers the billing page. Upgrades apply
immediately with proportional billing. The plugin itself is free — you only
ever pay for the API plan.

## How it reads

By default the verdict answers: **did the recent part of the visible
window change structurally, compared to how the window started?** The
first half of the window rides along as the reference, still costing one
analysis. Scores above 0.70 read as **stable**, below 0.35 as **unstable**
(structurally different), in between as **transition**. The semantic layer
adds a human-readable summary, alert level, and recommended action.

Two practical notes, validated against the production engine:

- **Give each side 400+ samples** (so a visible window of 800+ points).
  Below that the score drifts toward the transition band even on healthy
  signals — widen the time range or raise the query resolution.
- The alternative **engine-internal reference** (Panel options →
  Analysis → Compare against) asks whether the signal is self-consistent;
  trends and periodic signals often read as transition/unstable there.
  Use it only for signals that are supposed to be flat.

"Unstable" means the structure *changed* — whether that is bad is your
call; the panel shows the evidence.

## Options that matter

| Option | Default | Why |
| --- | --- | --- |
| Domain | Auto | The engine infers the best calibration; pick one explicitly if you know your signal type. |
| Compare against | Window start | Recent-vs-start verdict; healthy dynamic signals read stable. Same 1-analysis cost. |
| Run on demand only | **on** | Analysis costs quota; you decide when to spend it. |
| Re-analyze on refresh | **off** | Turning it on is the moment to size your plan (table above). |
| Deep mode | off | +1 analysis per window per run; shows *where* the change is. |
| Max samples sent to API | 9,500 | Free-tier-safe; raise to your plan's cap (Starter 100k · Growth 500k · Pro 1M · Enterprise 5M). |

## What leaves your Grafana (data & privacy)

Each analysis sends exactly this to the alphainfo API, over HTTPS,
authenticated by your `X-API-Key` header:

- the **numeric sample values** of the analyzed series (and, in the default
  window-start mode, the reference portion of the same series),
- the **sampling rate** (a number derived from the time spacing),
- the chosen **domain** and boolean analysis flags.

It does **not** send metric names, label sets, queries, dashboard metadata,
absolute timestamps, hostnames, or anything else identifying — the field
name shown in the footer never leaves your browser. Analysis results are
retained per your plan for audit replay (Free 7 days · Starter 30 · Growth
60 · Professional 90 · Enterprise 365 + on-prem option). See
[alphainfo.io/privacy](https://alphainfo.io/privacy) and
[alphainfo.io/terms](https://alphainfo.io/terms).

## Production considerations

**API key storage.** Grafana panel plugins store their options in the
dashboard JSON — including the API key. Anyone with dashboard *Viewer*
access can read it. This is fine for personal and internal dashboards where
viewers already share the key; for multi-tenant or public dashboards, wait
for the companion datasource plugin (roadmap), which keeps the key
encrypted server-side in `secureJsonData`.

**CORS.** The panel calls the alphainfo API directly from the browser. The
managed API at `alphainfo.io` allows any Grafana origin. Self-hosted
alphainfo deployments must whitelist the Grafana origin and expose the
`X-RateLimit-*` headers.

**Alerting.** Grafana alert rules fire off data-source queries, not panel
internals — this panel is an operator-facing triage signal, not an alert
source. To alert on structural scores, run the analysis upstream (cron or
pipeline POSTing to the API) and write the score back as a series. A
datasource plugin that makes these values queryable is on the roadmap.

## Troubleshooting

- **"Network error: Failed to fetch"** — CORS preflight failed. Self-hosted
  API deployments must whitelist the Grafana origin.
- **"Signal has N samples, but your plan allows up to M"** — lower *Max
  samples sent to API* to your plan's cap.
- **"Plan limit reached"** — the monthly allowance (or per-minute rate cap)
  is exhausted; the panel shows the reset hint from the `Retry-After` header
  and the upgrade path.
- **Quota missing from the footer** — the API response must expose
  `X-RateLimit-*` via CORS; the managed API does.
- **Unsigned plugin on self-hosted Grafana** — until the catalog signature
  lands, allow it explicitly:
  `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=alphainfo-regimedetection-panel`

## Development

```bash
npm install
npm run dev      # webpack watch into ./dist
npm run server   # docker compose: Grafana + this plugin at :3000
npm run test:ci  # jest
npm run build    # production build
```

Part of the AlphaInfo panel suite (Regime Detection · Signal Monitor for
Security Operations · Drift Monitor). The three plugins share the same
`src/core/` module, synced verbatim — fix once, fix everywhere.

## References

- [alphainfo API guide](https://alphainfo.io/v1/guide)
- [Pricing](https://alphainfo.io/pricing)
- [`plugin.json` reference](https://grafana.com/developers/plugin-tools/reference/plugin-json)
