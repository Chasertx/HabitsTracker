import { Stack } from 'expo-router';
import { colors } from '../../../theme';

// Opening a deep link straight to a workout or exercise still gives a back button to the list.
export const unstable_settings = { initialRouteName: 'index' };

/** The Workouts tab's own stack, so its screens open inside the tab and the tab bar stays visible. */
export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="exercises/[id]" options={{ title: '' }} />
    </Stack>
  );
}
