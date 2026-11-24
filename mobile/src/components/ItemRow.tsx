import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ListItem } from '../api';
import { colors, radius } from '../theme';
import DeleteButton from './DeleteButton';

type Props = {
  item: ListItem;
  onToggle: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
};

// Holding a row to drag it is handled by DraggableList, which wraps each row.
function ItemRow({ item, onToggle, onDelete }: Props) {
  const done = item.isCompleted;

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <Pressable
        onPress={() => onToggle(item)}
        style={styles.main}
        android_ripple={{ color: colors.accentSoft, borderless: false }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={item.title}
        accessibilityHint="Hold to reorder"
      >
        <View style={[styles.check, done && styles.checkOn]}>
          {done && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={3}>
          {item.title}
        </Text>
      </Pressable>

      <View style={styles.deleteSlot}>
        <DeleteButton onConfirm={() => onDelete(item)} label={`Delete ${item.title}`} />
      </View>
    </View>
  );
}

export default memo(ItemRow);

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
  rowDone: { backgroundColor: colors.background },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 16,
    gap: 14,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: -1 },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  titleDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  deleteSlot: { marginHorizontal: 10 },
});
