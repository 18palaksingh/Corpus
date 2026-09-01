import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { color, font } from '@/lib/theme';

/**
 * The five screens, as a bottom tab bar.
 *
 * The desktop's sticky sidebar has no equivalent on a phone, so the same five
 * destinations become tabs. The bar keeps the sidebar's ink ground and its
 * accent indicator, so the two platforms read as one product.
 *
 * The design uses no icons anywhere — the only graphics in the whole product
 * are CSS rectangles — so the tabs are labelled, with the sidebar's indicator
 * bar above the active one.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarActiveTintColor: color.pageBackground,
        tabBarInactiveTintColor: color.sidebarTertiary,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={tab('Home')} />
      <Tabs.Screen name="plan" options={tab('Plan')} />
      <Tabs.Screen name="limits" options={tab('Limits')} />
      <Tabs.Screen name="spend" options={tab('Spend')} />
      <Tabs.Screen name="profile" options={tab('Profile')} />
    </Tabs>
  );
}

function tab(title: string) {
  return {
    title,
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
    ),
    tabBarLabel: ({ focused }: { focused: boolean }) => (
      <Text style={[styles.label, { color: focused ? color.pageBackground : color.sidebarTertiary }]}>
        {title}
      </Text>
    ),
  };
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.ink,
    borderTopWidth: 0,
    height: 76,
    paddingTop: 8,
  },
  item: {
    paddingVertical: 4,
  },
  // The sidebar's 3×15 indicator bar, turned on its side for a horizontal bar.
  indicator: {
    width: 15,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: color.accentLight,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 12,
  },
});
