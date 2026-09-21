import { StyleSheet } from 'react-native';
import { color, fontSize, radius, signalColor, space } from '@steady/core';

/**
 * The Android app's styles.
 *
 * Every value comes from `@steady/core`, the same file the web app's CSS
 * custom properties are generated from. Change a colour there and it lands on
 * both platforms — there is no second palette to keep in sync.
 *
 * The one platform-specific thing here is the type stack: the mono/sans split
 * is the same rule as the web ("if it is a number or an all-caps metadata
 * label, it is mono"), but it resolves to the system faces rather than to
 * webfonts, so the app has no font loading step and no flash of unstyled text
 * on a cold start.
 */

export { color, signalColor, space, radius, fontSize };

export const mono = 'monospace';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.pageBackground,
  },
  content: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xxxl,
  },

  // ------------------------------------------------------------------ Text
  h1: {
    fontSize: fontSize.heading,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: color.ink,
  },
  h2: {
    fontSize: fontSize.title,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: color.ink,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: 23,
    color: color.ink,
  },
  bodyLarge: {
    fontSize: fontSize.bodyLarge,
    lineHeight: 25,
    color: color.ink,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: 19,
    color: color.muted,
  },
  metaLabel: {
    fontFamily: mono,
    fontSize: fontSize.label,
    letterSpacing: 1,
    color: color.muted,
    textTransform: 'uppercase',
  },
  numeric: {
    fontFamily: mono,
    color: color.ink,
  },

  // ----------------------------------------------------------------- Cards
  card: {
    backgroundColor: color.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    gap: space.md,
  },
  cardTight: {
    padding: space.lg,
  },

  // --------------------------------------------------------------- Buttons
  button: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  buttonText: {
    color: color.white,
    fontSize: fontSize.body,
    fontWeight: '500',
  },
  buttonSecondary: {
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonSecondaryText: {
    color: color.ink,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // ----------------------------------------------------------------- Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },

  // ----------------------------------------------------------------- Notes
  note: {
    backgroundColor: color.subtleFill,
    borderRadius: radius.md,
    padding: space.lg,
  },
  noteText: {
    fontSize: fontSize.caption,
    lineHeight: 19,
    color: color.muted,
  },

  // --------------------------------------------------------------- Inputs
  input: {
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    backgroundColor: color.white,
    padding: space.lg,
    fontSize: fontSize.body,
    color: color.ink,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  // --------------------------------------------------------------- Banners
  /**
   * The stale-data banner. Amber rather than red: the data being old is worth
   * flagging, but it is not an error and the app still works.
   */
  staleBanner: {
    backgroundColor: signalColor.amber.bg,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  staleBannerText: {
    color: signalColor.amber.fg,
    fontSize: fontSize.caption,
  },
  errorBanner: {
    backgroundColor: signalColor.red.bg,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  errorBannerText: {
    color: signalColor.red.fg,
    fontSize: fontSize.caption,
  },
});
