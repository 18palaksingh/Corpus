import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SteadyProvider } from '@/lib/SteadyContext';
import { color } from '@/lib/theme';

/**
 * The app shell.
 *
 * One provider wraps everything so the home snapshot is fetched once per
 * launch rather than once per tab — five tabs each fetching their own copy is
 * how the band on one screen ends up disagreeing with the band on another.
 */
export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <SteadyProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.pageBackground },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="pulse" options={{ presentation: 'modal' }} />
        </Stack>
      </SteadyProvider>
    </SafeAreaProvider>
  );
}
