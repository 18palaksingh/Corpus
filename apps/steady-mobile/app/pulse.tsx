import { PRIVACY_LINE, PULSE_QUESTIONS } from '@steady/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Caption, MetaLabel } from '@/components/ui';
import { submitCheckIn } from '@/lib/api';
import { useSteady } from '@/lib/SteadyContext';
import { color, fontSize, mono, radius, space, styles } from '@/lib/theme';

/**
 * The pulse check-in, on Android.
 *
 * Same instrument, same wording and same three steps as the web — the
 * questions come from `@steady/core` precisely so the thing being measured
 * cannot differ between platforms.
 *
 * Presented as a modal: it is a sixty-second task with an end, not a
 * destination, and it should close and return you to the signal it changed.
 */

type Step = 0 | 1 | 2;

interface Draft {
  energy: number | null;
  detachment: number | null;
  effectiveness: number | null;
  sleepHours: number;
  bodyPain: boolean | null;
  workedLate: boolean | null;
}

function Scale5({
  value,
  onChange,
  low,
  high,
}: {
  value: number | null;
  onChange: (value: number) => void;
  low: string;
  high: string;
}): React.ReactElement {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: value === n }}
            onPress={() => onChange(n)}
            style={{
              flex: 1,
              aspectRatio: 1,
              minHeight: 56,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: value === n ? color.primary : color.borderStrong,
              backgroundColor: value === n ? color.primary : color.white,
            }}
          >
            <Text
              style={{
                fontFamily: mono,
                fontSize: fontSize.bodyLarge,
                color: value === n ? color.white : color.ink,
              }}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.rowBetween}>
        <Caption>{low}</Caption>
        <Caption>{high}</Caption>
      </View>
    </View>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {[
        { label: 'Yes', choice: true },
        { label: 'No', choice: false },
      ].map(({ label, choice }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityState={{ selected: value === choice }}
          onPress={() => onChange(choice)}
          style={{
            flex: 1,
            padding: space.lg,
            alignItems: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: value === choice ? color.primary : color.borderStrong,
            backgroundColor: value === choice ? color.primary : color.white,
          }}
        >
          <Text style={{ color: value === choice ? color.white : color.ink }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A plain stepper rather than a slider: easier to hit, and exact. */
function SleepStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}): React.ReactElement {
  return (
    <View style={[styles.rowBetween, { gap: space.lg }]}>
      <Button
        label="−"
        variant="secondary"
        onPress={() => onChange(Math.max(0, Math.round((value - 0.5) * 2) / 2))}
      />
      <Text style={[styles.numeric, { fontSize: fontSize.heading }]}>{value}h</Text>
      <Button
        label="+"
        variant="secondary"
        onPress={() => onChange(Math.min(14, Math.round((value + 0.5) * 2) / 2))}
      />
    </View>
  );
}

export default function PulseScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apply } = useSteady();

  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<Draft>({
    energy: null,
    detachment: null,
    effectiveness: null,
    sleepHours: 7,
    bodyPain: null,
    workedLate: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void =>
    setDraft((current) => ({ ...current, [key]: value }));

  const advance = (): void => setStep((s) => (s < 2 ? ((s + 1) as Step) : s));

  const complete =
    draft.energy !== null &&
    draft.detachment !== null &&
    draft.effectiveness !== null &&
    draft.bodyPain !== null &&
    draft.workedLate !== null;

  async function save(): Promise<void> {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);

    try {
      const fresh = await submitCheckIn({
        energy: draft.energy as number,
        detachment: draft.detachment as number,
        effectiveness: draft.effectiveness as number,
        sleepHours: draft.sleepHours,
        bodyPain: draft.bodyPain as boolean,
        workedLate: draft.workedLate as boolean,
      });

      // The POST already returned the recomputed snapshot, so the home screen
      // updates without a second round-trip.
      apply(fresh);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your check-in');
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
    >
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: radius.pill,
              backgroundColor: i <= step ? color.primary : color.border,
            }}
          />
        ))}
      </View>

      <MetaLabel>Daily pulse · {step + 1} of 3</MetaLabel>

      {step === 0 ? (
        <>
          <Text style={styles.h1}>{PULSE_QUESTIONS.energy.question}</Text>
          <Scale5
            value={draft.energy}
            low={PULSE_QUESTIONS.energy.low}
            high={PULSE_QUESTIONS.energy.high}
            onChange={(value) => {
              set('energy', value);
              advance();
            }}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={styles.h2}>{PULSE_QUESTIONS.detachment.question}</Text>
          <Scale5
            value={draft.detachment}
            low={PULSE_QUESTIONS.detachment.low}
            high={PULSE_QUESTIONS.detachment.high}
            onChange={(value) => set('detachment', value)}
          />

          <Text style={styles.h2}>{PULSE_QUESTIONS.effectiveness.question}</Text>
          <Scale5
            value={draft.effectiveness}
            low={PULSE_QUESTIONS.effectiveness.low}
            high={PULSE_QUESTIONS.effectiveness.high}
            onChange={(value) => {
              set('effectiveness', value);
              if (draft.detachment !== null) advance();
            }}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={styles.h2}>{PULSE_QUESTIONS.sleepHours.question}</Text>
          <SleepStepper value={draft.sleepHours} onChange={(value) => set('sleepHours', value)} />

          <Text style={styles.h2}>{PULSE_QUESTIONS.bodyPain.question}</Text>
          <YesNo value={draft.bodyPain} onChange={(value) => set('bodyPain', value)} />

          <Text style={styles.h2}>{PULSE_QUESTIONS.workedLate.question}</Text>
          <YesNo value={draft.workedLate} onChange={(value) => set('workedLate', value)} />
        </>
      ) : null}

      {error ? <Banner tone="error">{error}</Banner> : null}

      <View style={{ gap: space.sm }}>
        {step === 2 ? (
          <Button label="Done" onPress={() => void save()} disabled={!complete} busy={saving} />
        ) : null}
        {step > 0 ? (
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setStep((s) => ((s - 1) as Step))}
          />
        ) : (
          <Button label="Not now" variant="secondary" onPress={() => router.back()} />
        )}
      </View>

      <Caption>{PRIVACY_LINE}</Caption>
    </ScrollView>
  );
}
