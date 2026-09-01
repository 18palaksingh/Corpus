import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { clampFill } from '@corpus/core';

import { color, font, layout, radius, text } from '@/lib/theme';

/**
 * Shared building blocks, mirroring the web app's `primitives.module.css`.
 * Keeping the two in step is what makes the phone feel like the same product
 * as the desktop rather than a separate app that happens to share a name.
 */

export function Card({
  children,
  dark,
  flush,
  style,
}: {
  children: React.ReactNode;
  dark?: boolean;
  flush?: boolean;
  style?: object;
}) {
  return (
    <View style={[dark ? layout.cardDark : layout.card, flush && layout.cardFlush, style]}>
      {children}
    </View>
  );
}

export function MicroLabel({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return <Text style={onDark ? text.microLabelOnDark : text.microLabel}>{children}</Text>;
}

export function CardHeading({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <Text style={[text.cardHeading, onDark && { color: color.pageBackground }]}>{children}</Text>
  );
}

export function ScreenHeader({ title, subhead }: { title: string; subhead: string }) {
  return (
    <View style={layout.pageHeader}>
      <Text style={text.pageTitle}>{title}</Text>
      <Text style={text.pageSubhead}>{subhead}</Text>
    </View>
  );
}

/** A single progress bar. `fill` and the track height both come from the design. */
export function Bar({
  fill,
  fillColor,
  height,
  round,
}: {
  fill: number;
  fillColor: string;
  height: number;
  round?: number;
}) {
  const r = round ?? radius.barSm;
  return (
    <View style={[layout.track, { height, borderRadius: r }]}>
      <View
        style={{
          width: clampFill(fill) as `${number}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: r,
        }}
      />
    </View>
  );
}

/** A label/value line, as used in the surplus breakdown and the commitments list. */
export function DetailRow({
  label,
  value,
  bold,
  divider,
}: {
  label: string;
  value: string;
  bold?: boolean;
  divider?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        divider && { borderBottomWidth: 1, borderBottomColor: color.borderLight },
      ]}
    >
      <Text style={[styles.detailLabel, bold && { fontFamily: font.semibold, color: color.ink }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, bold && { fontFamily: font.monoMedium, fontSize: 15 }]}>
        {value}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'dark',
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  variant?: 'dark' | 'secondary' | 'accent';
  disabled?: boolean;
  busy?: boolean;
}) {
  const isDark = variant === 'dark';
  const isAccent = variant === 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        isDark && { backgroundColor: pressed ? color.inkHover : color.ink },
        isAccent && { backgroundColor: pressed ? color.accentHover : color.accent },
        variant === 'secondary' && {
          backgroundColor: color.white,
          borderWidth: 1,
          borderColor: pressed ? color.ink : color.inputBorder,
        },
        (disabled || busy) && { opacity: 0.6 },
      ]}
    >
      {busy && <ActivityIndicator size="small" color={variant === 'secondary' ? color.ink : '#fff'} />}
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary'
            ? { color: color.ink, fontFamily: font.medium }
            : { color: '#fff' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Shown while the first snapshot loads. A spinner rather than a skeleton: the
 * screens are dense enough that a skeleton of them reads as a broken layout.
 */
export function Loading() {
  return (
    <View style={styles.centre}>
      <ActivityIndicator color={color.accent} />
      <Text style={[text.body, { marginTop: 12 }]}>Reading your accounts…</Text>
    </View>
  );
}

/**
 * The offline banner.
 *
 * A financial plan the user believes is current when it is not is worse than no
 * plan, so falling back to the cache is always stated, never silent.
 */
export function CachedBanner({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={[text.rowTitle, { fontSize: 13 }]}>Showing your last synced plan</Text>
        <Text style={[text.caption, { marginTop: 2 }]}>
          Corpus could not reach your accounts. Figures may be out of date.
        </Text>
      </View>
      <Button label={retrying ? 'Retrying' : 'Retry'} variant="secondary" onPress={onRetry} busy={retrying} />
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    paddingVertical: 12,
  },
  detailLabel: {
    fontFamily: font.regular,
    fontSize: 14,
    color: color.ink,
    flexShrink: 1,
  },
  detailValue: {
    fontFamily: font.mono,
    fontSize: 14,
    color: color.ink,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.control,
  },
  buttonLabel: {
    fontFamily: font.semibold,
    fontSize: 13,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.pageBackground,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.accentTint,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 14,
  },
});
