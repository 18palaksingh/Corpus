import {
  CARE_COMMISSION_DISCLOSURE,
  CARE_INTRO,
  CARE_OPTIONS,
  CARE_PARTNERS,
  CARE_PARTNERS_ARE_PLACEHOLDERS,
  TELE_MANAS,
} from '@steady/core';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Caption, Card, MetaLabel, Note } from '@/components/ui';
import { useSteady } from '@/lib/SteadyContext';
import { color, fontSize, radius, space, styles } from '@/lib/theme';

/**
 * The bridge to humans.
 *
 * Everything on this screen except the person's own signal comes from
 * `@steady/core` as constants, which means **the crisis number works with no
 * network, no session and no successful fetch**. On a phone that matters more
 * than anywhere else: the moment someone needs this screen is not a moment to
 * discover the API is down.
 */
export default function CareScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { snapshot } = useSteady();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
    >
      <Text style={styles.h1}>Let&rsquo;s get you support</Text>
      <Caption>
        {snapshot?.careOffered ? snapshot.signal.suggestion.reason : CARE_INTRO}
      </Caption>

      <View
        style={{
          backgroundColor: color.ink,
          borderRadius: radius.lg,
          padding: space.xl,
          gap: space.sm,
        }}
      >
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: fontSize.label,
            letterSpacing: 1,
            color: color.primaryOnDark,
            textTransform: 'uppercase',
          }}
        >
          Need help right now?
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openURL(`tel:${TELE_MANAS.phone}`)}
        >
          <Text style={{ fontSize: fontSize.title, fontWeight: '600', color: color.white }}>
            Call {TELE_MANAS.name} {TELE_MANAS.phone}
          </Text>
        </Pressable>
        <Text style={{ fontSize: fontSize.caption, color: '#9AA8A2' }}>{TELE_MANAS.detail}</Text>
      </View>

      {CARE_OPTIONS.map((option) => (
        <Card key={option.kind} tight>
          <Text style={[styles.body, { fontWeight: '500' }]}>{option.title}</Text>
          <Caption>{option.detail}</Caption>
        </Card>
      ))}

      <Card>
        <MetaLabel>Therapists</MetaLabel>

        {CARE_PARTNERS_ARE_PLACEHOLDERS ? (
          <Note>
            These are placeholder entries for building and reviewing this screen — not real
            practitioners. Real partners, with verified registrations, replace them before
            anyone outside the team sees this.
          </Note>
        ) : null}

        {CARE_PARTNERS.map((partner) => (
          <View key={partner.name} style={[styles.rowBetween, { paddingVertical: space.md }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.body, { fontWeight: '500' }]}>{partner.name}</Text>
              <Caption>{partner.credential}</Caption>
              <Caption>{partner.focus}</Caption>
              <Caption>
                {partner.languages.join(', ')} · {partner.modes.join(' and ')}
              </Caption>
            </View>
            <Text style={[styles.numeric, { fontSize: fontSize.bodyLarge, color: color.primaryDeep }]}>
              ₹{partner.firstSessionInr}
            </Text>
          </View>
        ))}

        <Caption>{CARE_COMMISSION_DISCLOSURE}</Caption>
      </Card>

      <Note>
        Steady is not a crisis service and does not provide therapy. If you are in danger right
        now, call {TELE_MANAS.phone} or your local emergency number.
      </Note>
    </ScrollView>
  );
}
