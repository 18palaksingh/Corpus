import { TELE_MANAS, type UnfreezePlan } from '@steady/core';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Caption, Card, MetaLabel, Note } from '@/components/ui';
import { rateUnfreeze, unfreeze, type CrisisCopy } from '@/lib/api';
import { color, fontSize, mono, radius, space, styles } from '@/lib/theme';

/**
 * The Task Unfreezer, on Android.
 *
 * The crisis branch works exactly as it does on the web, and for the same
 * reason: the server screens the text before the planner ever runs, so when a
 * disclosure comes back there is no plan to render alongside the helpline.
 * This screen replaces itself entirely rather than showing a banner over a
 * task list.
 */

type Result =
  | { kind: 'idle' }
  | { kind: 'crisis'; copy: CrisisCopy }
  | { kind: 'plan'; id: string; plan: UnfreezePlan }
  | { kind: 'tooShort'; message: string };

function Timer({ minutes }: { minutes: number }): React.ReactElement {
  const [remaining, setRemaining] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return undefined;

    tick.current = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  return (
    <View
      style={{
        backgroundColor: color.ink,
        borderRadius: radius.md,
        padding: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.lg,
      }}
    >
      <Text style={{ fontFamily: mono, fontSize: fontSize.heading, color: color.white }}>
        {Math.floor(remaining / 60)}:{`${remaining % 60}`.padStart(2, '0')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (remaining === 0) setRemaining(minutes * 60);
          setRunning((value) => !value);
        }}
        style={{
          backgroundColor: color.inkPanel,
          borderRadius: radius.md,
          paddingVertical: 10,
          paddingHorizontal: space.lg,
        }}
      >
        <Text style={{ color: color.white }}>
          {remaining === 0 ? 'Again' : running ? 'Pause' : `Start ${minutes} min`}
        </Text>
      </Pressable>
    </View>
  );
}

export default function UnfreezeScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [done, setDone] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rated, setRated] = useState(false);

  async function submit(): Promise<void> {
    if (busy || task.trim().length === 0) return;
    setBusy(true);
    setError(null);
    setDone(new Set());
    setRated(false);

    try {
      const response = await unfreeze(task);

      if (response.crisis) {
        setResult({ kind: 'crisis', copy: response.copy });
      } else if (response.plan && response.id) {
        setResult({ kind: 'plan', id: response.id, plan: response.plan });
      } else {
        setResult({
          kind: 'tooShort',
          message: response.message ?? 'Paste a bit more and try again.',
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not plan that task');
    } finally {
      setBusy(false);
    }
  }

  if (result.kind === 'crisis') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      >
        <View style={{ backgroundColor: color.ink, borderRadius: radius.lg, padding: space.xl, gap: space.lg }}>
          <Text style={{ fontSize: fontSize.heading, fontWeight: '600', color: color.white }}>
            {result.copy.heading}
          </Text>
          <Text style={{ color: '#C9DDD6', fontSize: fontSize.body, lineHeight: 23 }}>
            {result.copy.body}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(`tel:${TELE_MANAS.phone}`)}
            style={{
              backgroundColor: color.primaryOnDark,
              borderRadius: radius.md,
              padding: space.lg,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: color.primaryDeep,
                fontSize: fontSize.bodyLarge,
                fontWeight: '600',
              }}
            >
              {result.copy.action}
            </Text>
          </Pressable>

          <Text style={{ color: '#9AA8A2', fontSize: fontSize.caption, textAlign: 'center' }}>
            {result.copy.detail}
          </Text>
          <Text style={{ color: '#9AA8A2', fontSize: fontSize.caption }}>
            {result.copy.disclaimer}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Task Unfreezer</Text>
      <Caption>
        Paste the thing you have been circling. You get a first step, two questions for your
        manager, and ten minutes.
      </Caption>

      <TextInput
        style={[styles.input, styles.textarea]}
        value={task}
        onChangeText={setTask}
        multiline
        maxLength={2000}
        placeholder="Build the IRR summary for Fund III for the Friday client call"
        placeholderTextColor={color.mutedLight}
      />

      <Button
        label="Get my first step"
        onPress={() => void submit()}
        disabled={task.trim().length === 0}
        busy={busy}
      />

      {error ? <Banner tone="error">{error}</Banner> : null}
      {result.kind === 'tooShort' ? <Note>{result.message}</Note> : null}

      {result.kind === 'plan' ? (
        <>
          <View
            style={{
              borderLeftWidth: 3,
              borderLeftColor: color.primary,
              backgroundColor: color.subtleFill,
              padding: space.lg,
              borderRadius: radius.md,
            }}
          >
            <Text style={[styles.body, { fontStyle: 'italic' }]}>{result.plan.task}</Text>
          </View>

          <Card>
            <MetaLabel>Your first 3 steps</MetaLabel>
            {result.plan.steps.map((step, index) => (
              <Pressable
                key={step}
                accessibilityRole="button"
                accessibilityState={{ selected: done.has(index) }}
                onPress={() =>
                  setDone((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
                style={{ flexDirection: 'row', gap: space.lg, paddingVertical: space.md }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done.has(index) ? color.primary : color.subtleFill,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: mono,
                      fontSize: fontSize.caption,
                      color: done.has(index) ? color.white : color.primaryDeep,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.body,
                    { flex: 1 },
                    done.has(index) && {
                      color: color.mutedLight,
                      textDecorationLine: 'line-through',
                    },
                  ]}
                >
                  {step}
                </Text>
              </Pressable>
            ))}
          </Card>

          <Card>
            <MetaLabel>Ask your manager</MetaLabel>
            {result.plan.managerQuestions.map((question) => (
              <Text key={question} style={styles.body}>
                · {question}
              </Text>
            ))}
          </Card>

          <Timer minutes={result.plan.timerMinutes} />

          {rated ? (
            <Note>Thanks — that is the one number telling us whether this is working.</Note>
          ) : (
            <Card tight>
              <Text style={styles.body}>Did this help you start?</Text>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Yes"
                    variant="secondary"
                    onPress={() => {
                      setRated(true);
                      void rateUnfreeze(result.id, true).catch(() => undefined);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Not really"
                    variant="secondary"
                    onPress={() => {
                      setRated(true);
                      void rateUnfreeze(result.id, false).catch(() => undefined);
                    }}
                  />
                </View>
              </View>
            </Card>
          )}
        </>
      ) : null}

      <Note>
        The Unfreezer plans tasks. It does not give medical, legal or financial advice, and it
        cannot see anything about your job beyond what you paste here.
      </Note>
    </ScrollView>
  );
}
