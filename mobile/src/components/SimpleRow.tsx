import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import DeleteButton from './DeleteButton';

type Props = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onDelete: () => void;
  deleteLabel: string;
};

/** A card row with a title, optional leading/trailing content, and a delete (×) button. */
function SimpleRow({ title, subtitle, leading, trailing, onPress, onDelete, deleteLabel }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={styles.main}
        android_ripple={onPress ? { color: colors.accentSoft } : undefined}
        accessibilityRole={onPress ? 'button' : 'text'}
      >
        {leading}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {trailing}
      </Pressable>
      <View style={styles.deleteSlot}>
        <DeleteButton onConfirm={onDelete} label={deleteLabel} />
      </View>
    </View>
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
    marginBottom: 10,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 16,
    gap: 14,
  },
  text: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  deleteSlot: { marginHorizontal: 10 },
});
