export const RISK_CONFIG = {
  maxPosition: {
    min: 2,
    max: 25,
    step: 1,
    default: 10,
    label: 'Max position size',
    formatLabel: (v: number) => `${v}%`,
  },
  riskPerTrade: {
    min: 0.1,
    max: 3.0,
    step: 0.1,
    default: 0.5,
    label: 'Risk per trade',
    formatLabel: (v: number) => `${v.toFixed(1)}%`,
  },
  pauseThreshold: {
    min: 20,
    max: 60,
    step: 5,
    default: 35,
    label: 'Market pause threshold',
    formatLabel: (v: number) => `${v}%`,
  },
} as const;
