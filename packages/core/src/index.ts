/**
 * @corpus/core
 *
 * Shared between the Next.js web app and the Expo mobile app: the domain types,
 * the design tokens, INR formatting, and the planning model itself.
 *
 * The model is server-side. Both clients receive a `Snapshot` and render it —
 * neither does financial math of its own.
 */

export * from './types.js';
export * from './tokens.js';
export * from './format.js';
export { buildSnapshot } from './model/index.js';
export {
  computeCashflow,
  computeScore,
  projectScore,
  computePlan,
  planHeaderNote,
  computeLimits,
  limitStatus,
  computeAlerts,
  computeGoals,
  computeAllocation,
  computeHoldings,
  computePortfolio,
  computeSpendGuidance,
  computeProfile,
  computeSync,
} from './model/index.js';
export { ANANYA } from './data/persona.js';
