import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ListItem } from '../api';
import { rowsThatFit, wc } from './colors';

/** Unchecked items first in routine order, then checked ones. */
export const routineOrder = (items: ListItem[]) => [
  ...items.filter((i) => !i.isCompleted),
  ...items.filter((i) => i.isCompleted),
];

type Props = {
  items: ListItem[] | null;
  error?: boolean;
  height?: number;
  /** Changes on every draw so each tap of + is a new link (and reopens the add dialog). */
  stamp: number;
};

/**
 * Home-screen widget: today's routine. Tap an item to check it off, "+" to add one in the app,
 * the title to open the app. Plain rows rather than a scrolling list, so redraws don't flash.
 */
export function RoutineWidget({ items, error, height, stamp }: Props) {
  const list = items ? routineOrder(items) : [];
  const done = list.filter((i) => i.isCompleted).length;
  const max = rowsThatFit(height);
  const shown = list.length > max ? list.slice(0, max - 1) : list;
  const hidden = list.length - shown.length;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: wc.background,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <FlexWidget clickAction="OPEN_APP" style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text="Routine" style={{ fontSize: 18, fontWeight: '700', color: wc.text }} />
          {items ? (
            <TextWidget
              text={`  ${done}/${list.length}`}
              style={{ fontSize: 14, fontWeight: '700', color: wc.accent }}
            />
          ) : null}
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: `habits:///?add=${stamp}` }}
          accessibilityLabel="Add item"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: wc.accent,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget text="+" style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }} />
        </FlexWidget>
      </FlexWidget>

      {!items ? (
        <TextWidget
          text={error ? "Can't reach the server · tap to retry" : 'Loading…'}
          style={{ fontSize: 14, color: wc.muted }}
          clickAction="REFRESH"
        />
      ) : list.length === 0 ? (
        <TextWidget text="Nothing in your routine yet · tap + to add" style={{ fontSize: 14, color: wc.muted }} />
      ) : (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
          {shown.map((item) => (
            <FlexWidget
              key={item.id}
              clickAction="TOGGLE"
              clickActionData={{ id: item.id, done: item.isCompleted }}
              style={{
                width: 'match_parent',
                height: 36,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: wc.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                marginBottom: 6,
              }}
            >
              <FlexWidget
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: item.isCompleted ? wc.accent : wc.faint,
                  backgroundColor: item.isCompleted ? wc.accent : wc.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}
              >
                {item.isCompleted ? <TextWidget text="✓" style={{ fontSize: 12, color: '#FFFFFF' }} /> : null}
              </FlexWidget>
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget
                  text={item.title}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 15, color: item.isCompleted ? wc.faint : wc.text }}
                />
              </FlexWidget>
              {item.currentStreak > 0 ? (
                <TextWidget
                  text={`🔥 ${item.currentStreak}`}
                  style={{ fontSize: 13, fontWeight: '700', color: wc.flame, marginLeft: 8 }}
                />
              ) : null}
            </FlexWidget>
          ))}
          {hidden > 0 ? (
            <TextWidget
              text={`+${hidden} more`}
              clickAction="OPEN_APP"
              style={{ fontSize: 13, color: wc.muted, marginLeft: 4 }}
            />
          ) : null}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
