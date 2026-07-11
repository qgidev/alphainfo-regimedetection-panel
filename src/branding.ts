import type { PluginBranding } from './core/branding';

/**
 * AlphaInfo Regime Detection — the suite's flagship SKU, aimed at SRE /
 * observability teams. Pain: fixed-threshold alert fatigue (the #1
 * incident-response obstacle in Grafana's 2026 Observability Survey,
 * 30% of respondents). The panel classifies the series' structural
 * regime so operators see the change before a threshold fires.
 */
export const BRANDING: PluginBranding = {
  productName: 'AlphaInfo Regime Detection',
  eventNoun: 'regime change',
  ctaSubtitle:
    'Classify the visible series as stable / transition / unstable — see structural change before a fixed threshold fires.',
  defaultDomain: 'auto',
  testIdPrefix: 'alphainfo-regime',
};
