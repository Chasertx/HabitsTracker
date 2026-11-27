import { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ListItem } from '../api';
import { colors, radius, shadow } from '../theme';
import SwipeToDelete from './SwipeToDelete';

type Props = {
  item: ListItem;
  onToggle: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
};

// Swipe left to delete. Holding a row to drag it is handled by DraggableList, which wraps each row.
function ItemRow({ item, onToggle, onDelete }: Props) {
  const done = item.isCompleted;

  return (
    <SwipeToDelete onDelete={() => onDelete(item)} label={`Delete ${item.title}`}>
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
          <View style={[styles.check, done && styles.checkOn]}>{done && <Text style={styles.checkMark}>✓</Text>}</View>
          <Text style={[styles.title, done && styles.titleDone]} numberOfLines={3}>
            {item.title}
          </Text>
          {item.currentStreak > 0 && (
            <View
              style={[styles.streak, done && styles.streakDone]}
              accessibilityLabel={`${item.currentStreak} day streak, best ${item.bestStreak}`}
            >
              <Ionicons name="flame" size={18} color="#FF8A2B" />
              <Text style={styles.streakText}>{item.currentStreak}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </SwipeToDelete>
  );
}

export default memo(ItemRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    ...shadow,
  },
  rowDone: { backgroundColor: colors.surface, opacity: 0.6 },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 14,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: -1 },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 25,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  streakDone: { backgroundColor: colors.accentSoft },
  streakText: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  titleDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
