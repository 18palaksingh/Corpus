import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { color, signalColor, space, radius, fontSize, mono, styles } from '@/lib/theme';

/**
 * Shared primitives, mirroring the web app's `components/ui.tsx`.
 *
 * Deliberately the same names and the same props where it makes sense, so a
 * screen reads the same on both platforms and a change to what a "card" is
 * does not drift between them.
 */

export function Card({
  children,
  tight = false,
}: {
  children: React.ReactNode;
  tight?: boolean;
}): React.ReactElement {
  return <View style={[styles.card, tight && styles.cardTight]}>{children}</View>;
}

export function MetaLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return <Text style={styles.metaLabel}>{children}</Text>;
}

export function Caption({ children }: { children: React.ReactNode }): React.ReactElement {
  return <Text style={styles.caption}>{children}</Text>;
}

export function Note({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  busy?: boolean;
}): React.ReactElement {
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        inactive && styles.buttonDisabled,
        pressed && !inactive && { opacity: 0.85 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'secondary' ? color.ink : color.white} />
      ) : (
        <Text
          style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** The deck's "Suggested for you ›" row. */
export function ActionRow({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.cardTight,
        styles.rowBetween,
        pressed && { backgroundColor: color.subtleFill },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: '500' }]}>{title}</Text>
        {detail ? <Text style={styles.caption}>{detail}</Text> : null}
      </View>
      <Text style={{ color: color.mutedLight, fontSize: fontSize.title }}>›</Text>
    </Pressable>
  );
}

/** The green / amber / red pill. */
export function BandPill({ band }: { band: keyof typeof signalColor }): React.ReactElement {
  const palette = signalColor[band];
  const label = band === 'unknown' ? 'Not yet' : band[0]!.toUpperCase() + band.slice(1);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: palette.bg,
        borderRadius: radius.pill,
        paddingVertical: 6,
        paddingHorizontal: space.md,
      }}
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.solid }}
      />
      <Text
        style={{
          fontFamily: mono,
          fontSize: fontSize.label,
          letterSpacing: 1,
          color: palette.fg,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * The seven-day energy strip.
 *
 * Bars with hollow slots for missed days, exactly as on the web — a gap is
 * information, and a line chart would interpolate straight over it.
 */
export function EnergyStrip({ series }: { series: Array<number | null> }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56 }}>
      {series.map((energy, index) => (
        <View key={index} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
          {energy === null ? (
            <View
              style={{
                height: '100%',
                borderRadius: radius.sm,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: color.borderStrong,
              }}
            />
          ) : (
            <View
              style={{
                height: `${20 + ((energy - 1) / 4) * 80}%`,
                borderRadius: radius.sm,
                backgroundColor: color.primary,
                opacity: 0.85,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: 'stale' | 'error';
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={tone === 'stale' ? styles.staleBanner : styles.errorBanner}>
      <Text style={tone === 'stale' ? styles.staleBannerText : styles.errorBannerText}>
        {children}
      </Text>
    </View>
  );
}
