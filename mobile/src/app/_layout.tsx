import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { cancelDraftOnOutsideTouch } from '../components/Composer';
import { colors } from '../theme';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

// Every screen lives inside the tabs; each tab that needs deeper pages has its own stack.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      {/* Watches every touch (without taking it) so a tap outside an add field cancels it. */}
      <View style={styles.flex} onTouchStart={cancelDraftOnOutsideTouch}>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ThemeProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
