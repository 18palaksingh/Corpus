import { StyleSheet } from 'react-native';

import { barHeight, color, radius, space } from '@corpus/core';

/**
 * The design tokens, expressed as React Native styles.
 *
 * The values come from `@corpus/core` — the same source the web app's CSS
 * custom properties are generated from — so a token change lands on both
 * platforms at once. What is platform-specific is only the *form*: RN has no
 * `em` letter-spacing and no font shorthand, so tracking is converted to points
 * here and weights are expressed as font families.
 */

export { color, radius, space, barHeight };

/**
 * Font families.
 *
 * RN picks a face by family name rather than by weight, so each weight is its
 * own family. These names match the keys the fonts are loaded under in
 * `app/_layout.tsx`.
 */
export const font = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/**
 * The mono/sans split is the same hard rule as on web: numbers and all-caps
 * metadata labels are mono, everything else is sans.
 */
export const text = StyleSheet.create({
  heroMetric: {
    fontFamily: font.monoMedium,
    fontSize: 64,
    lineHeight: 55, // 64 × 0.86
    letterSpacing: -2,
    color: color.pageBackground,
  },
  cardMetric: {
    fontFamily: font.monoMedium,
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -1.2,
    color: color.ink,
  },
  pageTitle: {
    fontFamily: font.semibold,
    fontSize: 27,
    letterSpacing: -0.6,
    color: color.ink,
  },
  pageSubhead: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 23, // 15 × 1.55
    color: color.muted,
  },
  secondaryMetric: {
    fontFamily: font.mono,
    fontSize: 25,
    color: color.ink,
  },
  planFigure: {
    fontFamily: font.monoMedium,
    fontSize: 24,
    letterSpacing: -0.8,
    color: color.ink,
  },
  darkCardMetric: {
    fontFamily: font.mono,
    fontSize: 22,
    color: color.pageBackground,
  },
  cardHeading: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: color.ink,
  },
  rowTitle: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: color.ink,
  },
  tableCellMono: {
    fontFamily: font.mono,
    fontSize: 14,
    color: color.ink,
  },
  body: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 20, // 13 × 1.5
    color: color.muted,
  },
  bodyTight: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19, // 13 × 1.45
    color: color.muted,
  },
  bodyOnDark: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 21,
    color: color.bodyOnDark,
  },
  caption: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.muted,
  },
  /**
   * All-caps micro-label. The design's 0.14em becomes 1.4pt at 10px — RN
   * letter-spacing is absolute, not relative to the font size.
   */
  microLabel: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.muted,
  },
  microLabelOnDark: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.mutedOnDark,
  },
  tag: {
    fontFamily: font.mono,
    fontSize: 11,
  },
});

/** Card shells and the layout primitives the screens build from. */
export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.pageBackground,
  },
  /**
   * Page padding. Narrower than the desktop's 38px — on a 390pt screen that
   * would leave only 314pt of content.
   */
  scrollContent: {
    padding: 18,
    paddingBottom: 44,
    gap: 16,
  },
  card: {
    backgroundColor: color.cardBackground,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
  },
  cardDark: {
    backgroundColor: color.ink,
    borderRadius: radius.card,
  },
  cardFlush: {
    overflow: 'hidden',
  },
  cardPadded: {
    padding: space.card,
    gap: 13,
  },
  cardHeader: {
    padding: 19,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardHeaderMeta: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.muted,
  },
  pageHeader: {
    gap: 8,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  track: {
    backgroundColor: color.track,
    borderRadius: radius.barSm,
    overflow: 'hidden',
  },
});

/** No shadows anywhere — depth comes from 1px borders and light/dark contrast. */
export const NO_SHADOW = {
  shadowOpacity: 0,
  elevation: 0,
} as const;
