import { Tabs } from 'expo-router';

import { color, fontSize, mono } from '@/lib/theme';

/**
 * The five destinations, matching the web app's nav exactly.
 *
 * No icons: the labels are short, the tab bar carries the deck's ink ground,
 * and a set of five invented glyphs would be five more things to misread. The
 * accent indicator is the label colour, as on the web.
 */
export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: color.ink,
          borderTopWidth: 0,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: color.primaryOnDark,
        tabBarInactiveTintColor: color.mutedLight,
        tabBarLabelStyle: {
          fontFamily: mono,
          fontSize: fontSize.label,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        // Labels only. Without this the navigator still reserves (and on some
        // platforms draws) an empty icon slot above every label.
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="week" options={{ title: 'Week' }} />
      <Tabs.Screen name="unfreeze" options={{ title: 'Unfreeze' }} />
      <Tabs.Screen name="reset" options={{ title: 'Reset' }} />
      <Tabs.Screen name="care" options={{ title: 'Support' }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
