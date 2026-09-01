import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { CardStatus, IncomeInput, Snapshot } from '@corpus/core';
import { color, groupIndian, inr, timestampLabel } from '@corpus/core';

import { Screen } from '@/components/Screen';
import { Card, CardHeading, DetailRow, MicroLabel, ScreenHeader } from '@/components/ui';
import { apiBaseUrl } from '@/lib/api';
import { useSnapshot } from '@/lib/SnapshotContext';
import { font, layout, radius, space, text } from '@/lib/theme';

const TONE: Record<CardStatus['tone'], string> = {
  positive: color.positive,
  warning: color.warning,
  negative: color.negative,
  neutral: color.muted,
};

export default function ProfileScreen() {
  return (
    <Screen>
      {(snapshot) => (
        <>
          <ScreenHeader
            title="Your profile"
            subhead="Everything the plan is built from. Change a number and Corpus reruns in a few seconds."
          />
          <IncomeCard income={snapshot.profile.income} />
          <CommitmentsCard snapshot={snapshot} />
          <AccountsCard snapshot={snapshot} />
          <SyncCard snapshot={snapshot} />
        </>
      )}
    </Screen>
  );
}

/**
 * The income fields.
 *
 * Editable, as on the web — the plan is only as good as these numbers, and
 * making the user open a separate settings screen to fix a salary is how they
 * end up never fixing it. Saves are debounced so typing a five-digit figure is
 * one recalculation, not five.
 */
function IncomeCard({ income }: { income: IncomeInput }) {
  const { refresh } = useSnapshot();
  const [draft, setDraft] = useState(income);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setDraft(income);
  }, [income]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function update<K extends keyof IncomeInput>(key: K, value: IncomeInput[K]) {
    dirty.current = true;
    const next = { ...draft, [key]: value };
    setDraft(next);
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 700);
  }

  async function save(next: IncomeInput) {
    try {
      const res = await fetch(`${apiBaseUrl()}/api/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      dirty.current = false;
      setStatus('saved');
      await refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card style={[layout.cardPadded, { gap: 20 }]}>
      <View style={layout.row}>
        <CardHeading>Income</CardHeading>
        <Text
          style={[
            text.caption,
            status === 'saved' && { color: color.positive },
            status === 'error' && { color: color.negative },
          ]}
        >
          {status === 'saving' ? 'Recalculating…' : status === 'saved' ? 'Plan updated' : status === 'error' ? 'Could not save' : ''}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <Money label="Monthly take-home" value={draft.monthlyTakeHome} onChange={(v) => update('monthlyTakeHome', v)} />
        <Money label="Rental income" value={draft.rentalIncome} onChange={(v) => update('rentalIncome', v)} />
        <Money label="Freelance and other" value={draft.freelanceAndOther} onChange={(v) => update('freelanceAndOther', v)} />
        <Money label="Expected annual bonus" value={draft.expectedAnnualBonus} onChange={(v) => update('expectedAnnualBonus', v)} />
        <ReadOnly label="Income stability" value={draft.stability} />
        <ReadOnly label="Tax regime" value={draft.taxRegime} />
      </View>
    </Card>
  );
}

/** Grouped digits when idle, plain digits while editing — separators moving under the caret are worse than none. */
function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.control, styles.controlMono, focused && { borderColor: color.accent }]}
        keyboardType="number-pad"
        value={focused ? String(value) : `₹${groupIndian(value)}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(t) => {
          const digits = t.replace(/[^\d]/g, '');
          onChange(digits === '' ? 0 : Number(digits));
        }}
      />
    </View>
  );
}

/**
 * Stability and tax regime are read-only here.
 *
 * They change how the whole plan is built, not just one number, so they are set
 * during onboarding and changed from a full-screen picker rather than a tap
 * that silently rewrites the plan behind the user.
 */
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.control}>
        <Text style={styles.controlText}>{value}</Text>
      </View>
    </View>
  );
}

function CommitmentsCard({ snapshot }: { snapshot: Snapshot }) {
  const { profile } = snapshot;
  return (
    <Card style={[layout.cardPadded, { gap: 16 }]}>
      <CardHeading>Fixed commitments</CardHeading>
      <View>
        {profile.commitments.map((commitment) => (
          <DetailRow
            key={commitment.id}
            label={commitment.label}
            value={inr(commitment.monthlyAmount)}
            divider
          />
        ))}
        <DetailRow label="Total" value={inr(profile.commitmentsTotal)} bold />
      </View>
    </Card>
  );
}

function AccountsCard({ snapshot }: { snapshot: Snapshot }) {
  const { profile } = snapshot;
  return (
    <Card style={[layout.cardPadded, { gap: 16 }]}>
      <CardHeading>Cards and accounts</CardHeading>

      <View style={{ gap: 12 }}>
        {profile.cards.map((card) => (
          <View key={card.id} style={styles.accountRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={text.rowTitle}>
                {card.name} · {card.last4}
              </Text>
              <Text style={text.caption}>{card.caption}</Text>
            </View>
            <Text style={[styles.accountStatus, { color: TONE[card.tone] }]}>
              {card.utilisationLabel}
            </Text>
          </View>
        ))}

        {profile.accounts.map((account) => (
          <View key={account.id} style={styles.accountRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={text.rowTitle}>{account.label}</Text>
              <Text style={text.caption}>{account.caption}</Text>
            </View>
            <Text style={[styles.accountStatus, { color: color.muted }]}>{account.status}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        Corpus reads statements only. It never moves money without an approved plan.
      </Text>
    </Card>
  );
}

/** The sidebar's LAST RUN block has no home on a phone, so it lands here. */
function SyncCard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card style={[layout.cardPadded, { gap: 6 }]}>
      <MicroLabel>LAST RUN</MicroLabel>
      <Text style={styles.syncTime}>{timestampLabel(snapshot.sync.lastRunAt)}</Text>
      <Text style={text.caption}>{snapshot.sync.summary}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  fieldLabel: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.muted,
  },
  control: {
    borderWidth: 1,
    borderColor: color.inputBorder,
    backgroundColor: color.white,
    borderRadius: radius.control,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontSize: 15,
    color: color.ink,
  },
  controlMono: {
    fontFamily: font.mono,
  },
  controlText: {
    fontFamily: font.regular,
    fontSize: 15,
    color: color.ink,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.white,
    borderRadius: radius.innerGroup,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accountStatus: {
    fontFamily: font.mono,
    fontSize: 13,
  },
  footnote: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 20,
    color: color.muted,
    borderTopWidth: 1,
    borderTopColor: color.track,
    paddingTop: 14,
  },
  syncTime: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.ink,
  },
});
