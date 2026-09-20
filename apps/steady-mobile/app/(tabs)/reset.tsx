import { buildResetScript, RESET_PATTERN_LABEL } from '@steady/core';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Caption, MetaLabel } from '@/components/ui';
import { recordReset } from '@/lib/api';
import { color, fontSize, mono, space, styles } from '@/lib/theme';

/**
 * The blank-mind reset.
 *
 * The one screen that is genuinely useful with no network at all:
 * `buildResetScript()` is pure, so the whole ninety seconds runs locally. The
 * POST at the end is best-effort and its failure is swallowed — a breathing
 * exercise that reports an error because the wifi dropped would undo the
 * ninety seconds it just spent.
 */
export default function ResetScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const script = useMemo(() => buildResetScript(), []);

  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(script.steps[0]?.seconds ?? 0);
  const [finished, setFinished] = useState(false);
  const elapsed = useRef(0);
  const scale = useRef(new Animated.Value(1)).current;

  const step = script.steps[index];

  // The ring breathes with the step. Driven from the step's own duration, so
  // the animation and the count can never disagree.
  useEffect(() => {
    if (!running || !step) return;

    const target = step.kind === 'breathe-in' ? 1.12 : step.kind === 'breathe-out' ? 0.88 : 1;

    Animated.timing(scale, {
      toValue: target,
      duration: step.seconds * 1000,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [running, index, step, scale]);

  useEffect(() => {
    if (!running || finished) return undefined;

    const tick = setInterval(() => {
      elapsed.current += 1;

      setRemaining((value) => {
        if (value > 1) return value - 1;

        setIndex((current) => {
          const next = current + 1;
          if (next >= script.steps.length) {
            setRunning(false);
            setFinished(true);
            return current;
          }
          setRemaining(script.steps[next]?.seconds ?? 0);
          return next;
        });

        return 0;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [running, finished, script.steps]);

  useEffect(() => {
    if (!finished) return;
    void recordReset(elapsed.current, true).catch(() => undefined);
  }, [finished]);

  function restart(): void {
    elapsed.current = 0;
    setIndex(0);
    setRemaining(script.steps[0]?.seconds ?? 0);
    setFinished(false);
    scale.setValue(1);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.xxl, alignItems: 'center', gap: space.xxl, flexGrow: 1 },
      ]}
    >
      <MetaLabel>Blank-mind reset</MetaLabel>

      <Animated.View
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: finished ? color.white : color.subtleFill,
          borderWidth: 2,
          borderColor: color.primary,
          transform: [{ scale }],
        }}
      >
        <Text style={{ fontFamily: mono, fontSize: fontSize.display, color: color.primaryDeep }}>
          {finished ? '✓' : running ? remaining : 90}
        </Text>
      </Animated.View>

      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Text style={[styles.h2, { textAlign: 'center' }]}>
          {finished
            ? 'That is ninety seconds back.'
            : running
              ? (step?.text ?? '')
              : 'Ninety seconds. One tap.'}
        </Text>
        {running && script.steps[index + 1] ? (
          <Caption>Next: {script.steps[index + 1]?.text.toLowerCase()}</Caption>
        ) : null}
      </View>

      {!finished ? <MetaLabel>{RESET_PATTERN_LABEL}</MetaLabel> : null}

      <View style={{ width: '100%', gap: space.sm }}>
        {finished ? (
          <>
            <Button label="Unfreeze a task" onPress={() => router.push('/unfreeze')} />
            <Button label="Again" variant="secondary" onPress={restart} />
          </>
        ) : (
          <>
            <Button
              label={running ? 'Pause' : index === 0 && remaining === script.steps[0]?.seconds ? 'Start' : 'Resume'}
              variant={running ? 'secondary' : 'primary'}
              onPress={() => setRunning((value) => !value)}
            />
            <Button
              label="Skip to task"
              variant="secondary"
              onPress={() => router.push('/unfreeze')}
            />
          </>
        )}
      </View>

      <Caption>Works offline. Nothing here is recorded except that you did it.</Caption>
    </ScrollView>
  );
}
