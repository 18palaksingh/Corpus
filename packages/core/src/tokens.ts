/**
 * Corpus design tokens.
 *
 * Every value here is authoritative — taken directly from the design handoff.
 * Both the web and mobile apps consume these, so a token change lands on both
 * platforms at once. Do not hardcode a hex value anywhere else in the codebase.
 */

export const color = {
  /** Body text, sidebar background, dark cards, primary dark button */
  ink: '#14161A',
  /** Primary dark button hover */
  inkHover: '#000000',
  /** Rows inside dark cards */
  surfacePanel: '#1A1D22',
  /** Dividers inside dark cards */
  surfacePanelBorder: '#292C33',
  /** Labels on dark backgrounds */
  mutedOnDark: '#8A8D94',
  /** Paragraph text on dark backgrounds */
  bodyOnDark: '#C9CBD0',
  /** Sidebar metadata */
  sidebarSecondary: '#A9ABB1',
  /** Sidebar section labels */
  sidebarTertiary: '#6E7076',
  /** Nav item hover background */
  sidebarHover: '#22252B',
  /** App canvas */
  pageBackground: '#F4F4F2',
  /** All light cards */
  cardBackground: '#FBFBFA',
  /** Inner cells, inputs, secondary buttons */
  white: '#FFFFFF',
  /** Table header rows, card footers */
  subtleFill: '#F7F7F5',
  /** Card borders, section dividers */
  border: '#E4E3DF',
  /** Row dividers inside cards */
  borderLight: '#EFEEEB',
  /** Inputs, secondary button border */
  inputBorder: '#D8D7D3',
  /** Progress bar tracks */
  track: '#E9E8E5',
  /** Secondary copy, labels */
  muted: '#6E7076',
  /** Copy inside highlighted rows */
  bodyDim: '#4A4C52',
  /** Primary actions, progress fills, key figures */
  accent: '#1B3FA0',
  /** Primary button hover */
  accentHover: '#16337F',
  /** Score bars, active nav indicator — on dark surfaces only */
  accentLight: '#4C7BF0',
  /** "Best recommendation" row background */
  accentTint: '#F1F4FC',
  /** Debt allocation */
  accentSecondary: '#6C93EE',
  /** Within-limit bars, "Keep" actions, gains */
  positive: '#2E7D5B',
  /** At-limit bars, gold allocation, medium alerts */
  warning: '#C2A05A',
  /** Over-limit bars, "Stop"/"Review" actions, urgent alerts */
  negative: '#B4472B',
  /** Cash allocation, neutral chart fills */
  neutralChart: '#A9ABB1',
  neutralChartLight: '#D8D7D3',
} as const;

export type ColorToken = keyof typeof color;

/**
 * Asset-class colours for the stacked portfolio bar and allocation bars.
 * Order matters: it is the render order of the stacked bar.
 */
export const assetClassColor = {
  equity: color.accent,
  debt: color.accentSecondary,
  gold: color.warning,
  cash: color.neutralChartLight,
} as const;

/** The allocation screen draws cash in the darker neutral, not the bar's light one. */
export const allocationBarColor = {
  equity: color.accent,
  debt: color.accentSecondary,
  gold: color.warning,
  cash: color.neutralChart,
} as const;

export const font = {
  /** All UI text. */
  sans: "'Instrument Sans', Helvetica, sans-serif",
  /** Every numeric value and every all-caps micro-label. Hard rule. */
  mono: "'JetBrains Mono', monospace",
} as const;

/**
 * Type scale. `letterSpacing` and `lineHeight` are given in the units the
 * design specifies; web uses them verbatim, mobile converts (see `type.ts`
 * in the mobile app).
 */
export const type = {
  heroMetric: { family: 'mono', size: 64, weight: 500, lineHeight: 0.86, letterSpacing: -2 },
  cardMetric: { family: 'mono', size: 36, weight: 500, lineHeight: 1, letterSpacing: -1.2 },
  pageTitle: { family: 'sans', size: 27, weight: 600, letterSpacing: -0.6 },
  secondaryMetric: { family: 'mono', size: 25, weight: 400 },
  secondaryMetricSm: { family: 'mono', size: 23, weight: 400 },
  planStepFigure: { family: 'mono', size: 24, weight: 500, letterSpacing: -0.8 },
  darkCardMetric: { family: 'mono', size: 22, weight: 400 },
  logotype: { family: 'sans', size: 17, weight: 600, letterSpacing: -0.2 },
  cardHeading: { family: 'sans', size: 16, weight: 600 },
  pageSubhead: { family: 'sans', size: 15, weight: 400, lineHeight: 1.55 },
  fieldValue: { family: 'sans', size: 15, weight: 400 },
  rowTitle: { family: 'sans', size: 14, weight: 600 },
  navItem: { family: 'sans', size: 14, weight: 500 },
  tableCellMono: { family: 'mono', size: 14, weight: 400 },
  body: { family: 'sans', size: 13, weight: 400, lineHeight: 1.5 },
  bodyTight: { family: 'sans', size: 13, weight: 400, lineHeight: 1.45 },
  caption: { family: 'sans', size: 12, weight: 400 },
  microLabel: { family: 'mono', size: 10, weight: 400, letterSpacing: 0.14 },
  microLabelTable: { family: 'mono', size: 10, weight: 400, letterSpacing: 0.12 },
  tag: { family: 'mono', size: 11, weight: 400 },
} as const;

export const space = {
  /** Page padding — top/right-left/bottom. */
  page: { top: 32, x: 38, bottom: 60 },
  topBar: { y: 18, x: 38 },
  sidebar: { y: 26, x: 16 },
  /** Vertical gap between page sections. */
  section: 20,
  /** Gap between cards in a grid row. */
  cardGrid: 18,
  card: 24,
  cardCompact: 22,
  cardInnerCell: 20,
  tableRow: { y: 16, x: 24 },
  tableRowTall: { y: 17, x: 24 },
  tableHeader: { y: 11, x: 24 },
} as const;

export const radius = {
  card: 12,
  innerGroup: 9,
  control: 7,
  bar: 4,
  barSm: 3,
  logoMark: 3,
} as const;

export const barHeight = {
  goal: 6,
  allocation: 7,
  stacked: 8,
  score: 5,
} as const;

/** Sidebar is a fixed 228px column on desktop. */
export const SIDEBAR_WIDTH = 228;

/**
 * The design is fixed-desktop. These are the breakpoints the implementation
 * introduces — see the responsive notes in the repository README.
 */
export const breakpoint = {
  /** Below this, multi-column grids collapse and tables become stacked rows. */
  compact: 1100,
  /** Below this, the sidebar becomes a top drawer. */
  mobile: 760,
} as const;

/** No shadows anywhere. Depth comes from 1px borders and light/dark contrast. */
export const HOVER_TRANSITION = '120ms ease';
