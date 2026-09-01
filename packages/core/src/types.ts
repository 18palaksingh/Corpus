/**
 * Corpus domain types.
 *
 * Two halves:
 *   - `*Input` types are what a user's linked accounts and profile produce.
 *   - Everything else is model output — computed server-side and sent to the
 *     client ready to render. The client does no financial math.
 */

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type IncomeStability = 'Salaried, permanent' | 'Salaried, contract' | 'Self-employed' | 'Variable';
export type TaxRegime = 'Old regime' | 'New regime';
export type AssetClass = 'equity' | 'debt' | 'gold' | 'cash';

export interface IncomeInput {
  /** Net salary credited each month. */
  monthlyTakeHome: number;
  /** Rent received, net of maintenance. */
  rentalIncome: number;
  /** Freelance, consulting and anything else irregular. */
  freelanceAndOther: number;
  /** Expected annual bonus. Feeds goal projections, never monthly surplus. */
  expectedAnnualBonus: number;
  /** Calendar month the bonus lands, 1–12. Used when projecting goal dates. */
  bonusMonth: number;
  stability: IncomeStability;
  taxRegime: TaxRegime;
}

export interface CommitmentInput {
  id: string;
  label: string;
  monthlyAmount: number;
  /** Present when the commitment services a loan — drives prepayment ranking. */
  loan?: {
    /** Annual interest rate as a fraction, e.g. 0.094 for 9.4%. */
    interestRate: number;
    outstandingPrincipal: number;
    /** Scheduled closure with no prepayment. */
    scheduledEnd: string;
  };
}

export interface CategorySpendInput {
  id: string;
  label: string;
  spent: number;
  limit: number;
  /**
   * Treated as a commitment rather than discretionary spend — shown in the
   * limits table but never asked to shrink.
   */
  fixed?: boolean;
  /**
   * Already counted under fixed commitments. Shown in the limits table so the
   * user sees a ceiling for it, but excluded from variable spend so the
   * cashflow does not double-count it.
   */
  inCommitments?: boolean;
  /**
   * Rupees per month the recommendations engine believes are recoverable in
   * this category. Internal to the model: the UI shows the total, never the
   * split.
   */
  identifiedSaving: number;
  /** The "WHAT TO DO" cell. */
  note: string;
  /**
   * Set when going over this category has an actionable alternative on the
   * "Where to spend" screen. Only categories with one raise a dashboard alert —
   * an overshoot the user can do nothing about is noise.
   */
  alertBody?: string;
}

export interface CardInput {
  id: string;
  name: string;
  /** Last four digits. */
  last4: string;
  creditLimit: number;
  outstanding: number;
  /** Day of the month the statement is generated. */
  statementDay: number;
}

export interface AccountInput {
  id: string;
  label: string;
  bank: string;
}

export interface HoldingInput {
  id: string;
  name: string;
  value: number;
  assetClass: AssetClass;
  /** Reason the position is what it is — feeds the "WHY" column. */
  why: string;
  /** Set when the model's holding rules flag this position. */
  flag?: 'overlap' | 'overweight' | 'low-return';
  /**
   * Held out of the "changes to what you already hold" table. Used for
   * positions the monthly plan already acts on directly, where a second
   * instruction would contradict the plan.
   */
  excludeFromReview?: boolean;
  /** Raised on the dashboard when the model's holding rules flag this position. */
  alert?: { title: string; body: string; severity: Severity };
}

export interface GoalInput {
  id: string;
  /** "Retirement at 58" */
  label: string;
  /** "retirement" — used mid-sentence in generated copy. */
  shortLabel: string;
  current: number;
  target: number;
  /** Date the user wants this met. */
  targetDate: string;
  /** Monthly contribution the goal needs beyond what is already committed. */
  monthlyShortfall: number;
  priority: number;
}

export interface PortfolioInput {
  totalValue: number;
  /** Current weights by asset class. Fractions summing to 1. */
  current: Record<AssetClass, number>;
  /** Weights the model is steering towards. Fractions summing to 1. */
  target: Record<AssetClass, number>;
  /** Extended internal rate of return since inception. */
  xirr: number;
  xirrSince: string;
}

export interface PeriodInput {
  /** First day of the period being planned, ISO. */
  start: string;
  /** Categories the user is tracked against this period. */
  categories: CategorySpendInput[];
  /** Spend outside the tracked categories. Part of variable spend. */
  otherVariableSpend: number;
  /**
   * The p90 month-on-month overshoot of variable spend across the last six
   * periods. Held back from the investable pool so one bad month does not
   * force a redemption.
   */
  variableSpendVolatility: number;
  /** Mean surplus over the last six periods, for the comparison line. */
  sixMonthAverageSurplus: number;
}

/**
 * Merchant, travel and card-routing content.
 *
 * In production this is the output of the recommendations engine running over
 * the user's transaction history and a merchant price index. It is typed as
 * input here so the planning model stays a pure function of the user's data.
 */
export interface GuidanceStat {
  kind: 'monthly-saving' | 'annual-remaining';
  amount: number;
}

export interface GuidanceGroupInput {
  id: string;
  title: string;
  stat: GuidanceStat;
  items: Recommendation[];
}

export interface UpsideComponent {
  label: string;
  annual: number;
}

export interface GuidanceInput {
  groups: GuidanceGroupInput[];
  routing: CardRouting[];
  /** Components of the annual upside figure. Summed, never shown split. */
  upsideComponents: UpsideComponent[];
  upsideCopy: string;
  /** Copy for the travel-budget highlight card on the limits screen. */
  travelBudgetCopy: string;
  /** Copy for the rent-ceiling highlight card. */
  rentCeilingCopy: string;
  /** Copy for the reclaimable highlight card. */
  reclaimableCopy: string;
}

export interface UserInput {
  name: string;
  city: string;
  dependents: number;
  income: IncomeInput;
  commitments: CommitmentInput[];
  cards: CardInput[];
  accounts: AccountInput[];
  holdings: HoldingInput[];
  goals: GoalInput[];
  portfolio: PortfolioInput;
  /**
   * Essential monthly outgo the emergency fund must cover. Wider than
   * commitments plus variable spend: it includes lumpy annual costs
   * (insurance renewals, school terms) amortised across the year.
   */
  essentialMonthlyOutgo: number;
  /** Section 80C deduction claimed so far this financial year. */
  section80CUsed: number;
  /** Annual travel budget and what has been spent against it. */
  annualTravelBudget: number;
  annualTravelSpent: number;
  /** Merchant, travel and card-routing content. */
  guidance: GuidanceInput;
  period: PeriodInput;
  /** When the plan was last generated. */
  lastRunAt: string;
}

// ---------------------------------------------------------------------------
// Model output
// ---------------------------------------------------------------------------

export type Severity = 'urgent' | 'advisory' | 'opportunity';
export type LimitStatus = 'under' | 'at' | 'over';
export type HoldingActionKind = 'keep' | 'stop-sip' | 'hold' | 'review';
export type PlanActionKind = 'invest' | 'prepay' | 'park';
export type RecommendationKind = 'best' | 'also' | 'avoid' | 'card';

export interface ScoreBreakdown {
  /** 0–100, rounded. The only score number the product ever shows. */
  value: number;
  /** Filled segments of the four-segment bar. */
  segmentsFilled: number;
  totalSegments: number;
  /** One line of plain English. Never a factor breakdown. */
  summary: string;
}

export interface CashflowSummary {
  totalIncome: number;
  fixedCommitments: number;
  variableSpend: number;
  surplus: number;
  surplusVsAverage: number;
}

export interface PlanAction {
  kind: PlanActionKind;
  /** "01 · INVEST" */
  stepLabel: string;
  amount: number;
  /** "Broad-market index SIP" — the dashboard's plan cells. */
  title: string;
  /** "Broad-market index fund" — the instrument itself, on the plan screen. */
  detailTitle: string;
  /** "Monthly SIP, 3rd of the month" — how and when it executes. */
  caption: string;
  reason: string;
}

export interface MonthlyPlan {
  /** Total the three actions deploy. */
  investable: number;
  /** Held back against spending volatility. */
  buffer: number;
  actions: PlanAction[];
  /** When the actions execute once approved. */
  scheduledFor: string;
  /** Rendered in the plan card footer. */
  footerNote: string;
  /** "IF YOU HOLD THIS FOR 12 MONTHS" copy on the plan screen. */
  twelveMonthOutlook: string;
  /** Score the outlook projects. */
  projectedScore: number;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  /** Screen this alert links to, when it has one. */
  linkTo?: 'dashboard' | 'plan' | 'limits' | 'spend' | 'profile';
}

export interface GoalProgress {
  id: string;
  label: string;
  /** 0–1. */
  progress: number;
  /** Bar fill, 0–1. Equals `progress` unless the goal is behind. */
  fill: number;
  /** "68%" or "Behind". */
  rightValue: string;
  onTrack: boolean;
  caption: string;
}

export interface AllocationRow {
  assetClass: AssetClass;
  label: string;
  current: number;
  target: number;
  /** "54% → 62%" */
  shiftLabel: string;
}

export interface PortfolioSummary {
  totalValue: number;
  xirr: number;
  xirrSince: string;
  /** Stacked-bar segments in render order. */
  segments: { assetClass: AssetClass; weight: number; label: string }[];
}

export interface HoldingReview {
  id: string;
  name: string;
  value: number;
  action: string;
  actionKind: HoldingActionKind;
  why: string;
}

export interface CategoryLimit {
  id: string;
  label: string;
  spent: number;
  limit: number;
  /** Actual ratio, may exceed 1. */
  usage: number;
  /** Bar fill, clamped to 1. */
  fill: number;
  status: LimitStatus;
  /** "118%" */
  usageLabel: string;
  note: string;
}

export interface LimitsSummary {
  withinLimit: number;
  totalCategories: number;
  reclaimablePerMonth: number;
  rows: CategoryLimit[];
  /** The three cards under the table. */
  highlights: { label: string; value: string; accent?: boolean; copy: string }[];
}

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  body: string;
}

export interface RecommendationGroup {
  id: string;
  title: string;
  /** Right-aligned accent stat in the card header. */
  stat: string;
  items: Recommendation[];
}

export interface CardRouting {
  /** "GROCERIES AND BILLS" */
  label: string;
  name: string;
  body: string;
}

export interface SpendGuidance {
  groups: RecommendationGroup[];
  routing: CardRouting[];
  annualUpside: number;
  annualUpsideCopy: string;
}

export interface CardStatus {
  id: string;
  name: string;
  last4: string;
  caption: string;
  utilisation: number;
  utilisationLabel: string;
  tone: 'positive' | 'warning' | 'negative' | 'neutral';
}

export interface ProfileView {
  name: string;
  city: string;
  dependents: number;
  income: IncomeInput;
  commitments: { id: string; label: string; monthlyAmount: number }[];
  commitmentsTotal: number;
  cards: CardStatus[];
  accounts: { id: string; label: string; caption: string; status: string }[];
}

export interface SyncSummary {
  lastRunAt: string;
  accounts: number;
  cards: number;
  holdings: number;
  /** "4 accounts, 2 cards and 6 holdings in sync." */
  summary: string;
}

/**
 * Everything the five screens read, in one payload. Generated server-side by
 * `buildSnapshot`; the client renders it and nothing else.
 */
export interface Snapshot {
  generatedAt: string;
  period: { start: string; label: string };
  user: { name: string; city: string; dependents: number; subtitle: string };
  sync: SyncSummary;
  score: ScoreBreakdown;
  cashflow: CashflowSummary;
  portfolio: PortfolioSummary;
  plan: MonthlyPlan;
  alerts: Alert[];
  goals: GoalProgress[];
  allocation: AllocationRow[];
  allocationNote: string;
  holdings: HoldingReview[];
  limits: LimitsSummary;
  spend: SpendGuidance;
  profile: ProfileView;
}
