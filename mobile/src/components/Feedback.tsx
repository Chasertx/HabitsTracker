import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

/** A dismissible error message. Renders nothing when `message` is null. */
export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <Pressable onPress={onDismiss} style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>✦</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { color: colors.danger, fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { color: colors.accent, fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptyBody: { color: colors.textMuted, fontSize: 15, marginTop: 6, textAlign: 'center' },
});
