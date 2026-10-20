import type { Config } from "./types";
export const CONFIG: Config = {
  transferPerKm: 2000,
  transferPerSheet: 15,
  qualityPenalty: 100,
  receiverMarkup: 0.08,
  splitUnit: 500,
  maxFlexible: 6,
  maxDelay: 3,
  maxCandidates: 6000,
  approvalSeconds: 120,
  horizon: 14,
};
