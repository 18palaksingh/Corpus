/**
 * Steady design tokens.
 *
 * Every hex here was sampled from the product pitch deck, so the app and the
 * deck cannot drift. Both clients consume this file — the web app generates its
 * CSS custom properties from it, the mobile app imports the values directly.
 * Do not hardcode a colour anywhere else.
 *
 * The palette is deliberately calm. This is an app people open on their worst
 * days; saturated alarm colours are reserved for the one thing that earns them
 * (a red signal), and never used for ordinary UI chrome.
 */

export const color = {
  /** Headings, body text, dark surfaces. The deck's near-black green. */
  ink: '#1C2724',
  /** Dark card interiors sitting on `ink`. */
  inkPanel: '#26332F',
  /** Brand green — primary buttons, the active nav indicator, links. */
  primary: '#2C6A5C',
  /** Primary button hover / pressed. */
  primaryHover: '#25574E',
  /** Deep green for dark brand surfaces (onboarding, splash). */
  primaryDeep: '#173F38',
  /** Brand green at reading weight on dark surfaces. */
  primaryOnDark: '#8FC9B8',
  /** Secondary text, metadata labels, axis labels. */
  muted: '#5B6964',
  /** Disabled text, placeholder copy. */
  mutedLight: '#9AA8A2',
  /** App canvas. */
  pageBackground: '#F4F7F5',
  /** Cards and sheets. */
  cardBackground: '#FFFFFF',
  /** Tinted fills — selected chips, table headers, callouts. */
  subtleFill: '#E6EFEB',
  /** Tinted fill, one step deeper. */
  subtleFillStrong: '#D6E6E0',
  /** Card borders and dividers. */
  border: '#D5DEDA',
  /** Row dividers inside cards. */
  borderLight: '#E6EFEB',
  /** Input borders, secondary button borders. */
  borderStrong: '#C9DDD6',
  white: '#FFFFFF',
} as const;

/**
 * The three burnout signal bands.
 *
 * `fg` is legible on `bg`, and `solid` is legible on white — the pairs are
 * checked by a token test so a palette edit cannot quietly break contrast.
 */
export const signalColor = {
  green: { solid: '#2C6A5C', bg: '#E6EFEB', fg: '#173F38' },
  amber: { solid: '#D9893A', bg: '#FBEBD9', fg: '#9A5A17' },
  red: { solid: '#B5473A', bg: '#F6E1DE', fg: '#8A3226' },
  /** Shown before there are enough check-ins to say anything honest. */
  unknown: { solid: '#9AA8A2', bg: '#F4F7F5', fg: '#5B6964' },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  /** All-caps metadata labels. */
  label: 11,
  caption: 13,
  body: 15,
  bodyLarge: 17,
  title: 21,
  heading: 27,
  display: 40,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

/**
 * Type families.
 *
 * The rule, on both platforms: if it is a number or an all-caps metadata
 * label, it is mono. Everything a person reads as a sentence is sans.
 */
export const fontFamily = {
  sans: 'Instrument Sans',
  mono: 'JetBrains Mono',
} as const;

export type SignalBand = keyof typeof signalColor;
