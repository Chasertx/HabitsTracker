import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

type Props = {
  eyebrow: string;
  title: string;
  /** Shown to the right of the eyebrow and title, vertically centred on them. */
  actions?: ReactNode;
  /** Shown full width below the title (e.g. the add-item input). */
  children?: ReactNode;
};

/** Large tab-screen header: small coloured line, big title, optional actions and content. */
export default function ScreenHeader({ eyebrow, title, actions, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.heading} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
      {children && <View style={styles.below}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, paddingLeft: 6 },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heading: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  below: { marginTop: 16 },
});
