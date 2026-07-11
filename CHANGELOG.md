# Changelog

## 1.0.0

Initial release.

- Structural regime classification (stable / transition / unstable) for any
  numeric time series from any Grafana data source, via the alphainfo API.
- Default reference: recent window vs window start (one analysis), with the
  engine-internal reference as an option.
- Verdict badge with structural score and semantic alert level.
- Regime overlay on the chart.
- Insight sidebar: engine reading (summary, severity, recommended action)
  plus "what changed" attribution of the dominant structural dimension
  with a suggested next step.
- 5-dimensional structural fingerprint radar (D1..D5) — diagnoses which
  kind of change occurred, with a graceful explainer when the fingerprint
  is unavailable.
- Audit replay: in-panel viewer of the full recorded analysis payload
  (free of quota).
- Deep mode: per-window timeline showing WHERE the change happened
  (2–10 windows, one batch call per run).
- Quota-aware by design: run-on-demand default, explicit per-run cost in
  the UI, live quota footer from `X-RateLimit-*` headers, upgrade link when
  the allowance runs low, dedicated plan-limit state on HTTP 429.
- Robust series extraction: NaN/gap handling, linear interpolation of small
  gaps, uniform downsampling to the plan's sample cap.
