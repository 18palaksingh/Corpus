import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Caption, Card, MetaLabel, Note } from '@/components/ui';
import { apiBaseUrl, deleteAccount, getAccount, pair, type AccountInfo } from '@/lib/api';
import { useSteady } from '@/lib/SteadyContext';
import { color, space, styles } from '@/lib/theme';

/**
 * Account and privacy.
 *
 * Two things live here that do not fit anywhere else:
 *
 *   - **Pairing.** Six digits from the web app moves this phone onto a real
 *     account, so an anonymous install stops being a single point of failure.
 *   - **The honest warning.** An anonymous account cannot be recovered, and
 *     this screen says so *before* someone loses a phone rather than in a
 *     support email afterwards.
 */
export default function ProfileScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { refresh } = useSteady();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccount(await getAccount());
    } catch {
      // Offline: the rest of the screen is still useful, so this is not an
      // error state worth shouting about.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function submitCode(): Promise<void> {
    if (code.trim().length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await pair(code.trim());
      setMessage(
        `Paired${result.email ? ` with ${result.email}` : ''}. ` +
          `${result.movedDays} day${result.movedDays === 1 ? '' : 's'} of check-ins moved across` +
          (result.skippedDays > 0
            ? `, and ${result.skippedDays} were kept as they already were on that account.`
            : '.'),
      );
      setCode('');
      await Promise.all([load(), refresh()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not pair');
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(): Promise<void> {
    setBusy(true);
    try {
      await deleteAccount();
      setMessage('Deleted. Restart the app to start fresh, anonymously.');
      setAccount(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the account');
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Account</Text>
      <Caption>
        {account?.anonymous === false
          ? (account.email ?? account.name ?? 'Signed in')
          : 'Anonymous account'}
      </Caption>

      {message ? <Banner tone="stale">{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card>
        <MetaLabel>What Steady does with this</MetaLabel>
        <Text style={styles.body}>· Your answers are visible to you and nobody else.</Text>
        <Text style={styles.body}>
          · No employer, manager or HR team can see your answers, your signal, or whether you use
          Steady at all.
        </Text>
        <Text style={styles.body}>
          · Team reporting is not built. When it is, it will show aggregates over groups of ten or
          more and will never be able to name a person.
        </Text>
        <Text style={styles.body}>· Deleting your account deletes all of it, immediately.</Text>
      </Card>

      {account?.anonymous !== false ? (
        <Note>
          This account is anonymous, so there is no way to prove it is yours. If you lose this
          phone, the history goes with it. Pairing it with a web account fixes that — and does
          not attach your answers to anything an employer can see.
        </Note>
      ) : null}

      <Card>
        <MetaLabel>Pair with my account</MetaLabel>
        <Caption>
          Sign in on the Steady website, open Account, and tap &ldquo;Show a pairing
          code&rdquo;. Then type the six digits here.
        </Caption>
        <TextInput
          style={[styles.input, { letterSpacing: 6, fontFamily: 'monospace' }]}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={color.mutedLight}
        />
        <Button
          label="Pair this phone"
          onPress={() => void submitCode()}
          disabled={code.trim().length !== 6}
          busy={busy}
        />
      </Card>

      <Card>
        <MetaLabel>Delete everything</MetaLabel>
        <Caption>
          Every check-in, win and plan on this account. Immediate, and not recoverable.
        </Caption>
        {confirmingDelete ? (
          <View style={{ gap: space.sm }}>
            <Text style={[styles.body, { fontWeight: '500' }]}>
              Delete your account and all of its data?
            </Text>
            <Button label="Yes, delete it" onPress={() => void removeAccount()} busy={busy} />
            <Button
              label="Keep it"
              variant="secondary"
              onPress={() => setConfirmingDelete(false)}
            />
          </View>
        ) : (
          <Button
            label="Delete my account"
            variant="secondary"
            onPress={() => setConfirmingDelete(true)}
          />
        )}
      </Card>

      <Caption>Server: {apiBaseUrl()}</Caption>
    </ScrollView>
  );
}
