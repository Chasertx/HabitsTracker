import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import SwipeToDelete from './SwipeToDelete';

type Props = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onDelete: () => void;
  deleteLabel: string;
  /** Outlines the row, e.g. for a workout that's in progress. */
  highlight?: boolean;
  /** Dims the title, e.g. for an exercise whose sets are all done. */
  done?: boolean;
};

/** A card row with a title, optional leading/trailing content, and a delete (×) button. */
function SimpleRow({ title, subtitle, leading, trailing, onPress, onDelete, deleteLabel, highlight, done }: Props) {
  return (
    <SwipeToDelete onDelete={onDelete} label={deleteLabel} style={styles.spacing}>
      <View style={[styles.row, highlight && styles.rowHighlight]}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={styles.main}
          android_ripple={onPress ? { color: colors.accentSoft } : undefined}
          accessibilityRole={onPress ? 'button' : 'text'}
        >
          {leading}
          <View style={styles.text}>
            <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {trailing}
        </Pressable>
      </View>
    </SwipeToDelete>
  );
}

export default memo(SimpleRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowHighlight: { borderColor: colors.success, borderWidth: 1 },
  text: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  titleDone: { color: colors.textMuted },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  spacing: { marginBottom: 10 },
});
