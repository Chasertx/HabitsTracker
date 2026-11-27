import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget';
import type { ListItem } from '../api';

// Widget colours match the app's theme (widgets need plain hex strings).
const c = {
  background: '#1A1D27',
  surface: '#242836',
  text: '#F4F5FA',
  muted: '#A3A8BC',
  faint: '#6E7489',
  accent: '#8E80FF',
  flame: '#FF8A2B',
} as const;

/** Unchecked items first in routine order, then checked ones. */
export const routineOrder = (items: ListItem[]) => [
  ...items.filter((i) => !i.isCompleted),
  ...items.filter((i) => i.isCompleted),
];

type Props = { items: ListItem[] | null; error?: boolean };

/** Home-screen widget: today's routine. Tap an item to check it off, tap the title to open the app. */
export function RoutineWidget({ items, error }: Props) {
  const list = items ? routineOrder(items) : [];
  const done = list.filter((i) => i.isCompleted).length;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c.background,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
      >
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text="Routine" style={{ fontSize: 18, fontWeight: '700', color: c.text }} />
        </FlexWidget>
        {items && (
          <TextWidget text={`${done}/${list.length}`} style={{ fontSize: 14, fontWeight: '700', color: c.accent }} />
        )}
      </FlexWidget>

      {!items ? (
        <TextWidget
          text={error ? "Can't reach the server" : 'Loading…'}
          style={{ fontSize: 14, color: c.muted }}
          clickAction="REFRESH"
        />
      ) : list.length === 0 ? (
        <TextWidget text="Nothing in your routine yet" style={{ fontSize: 14, color: c.muted }} />
      ) : (
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {list.map((item) => (
            <FlexWidget
              key={item.id}
              clickAction="TOGGLE"
              clickActionData={{ id: item.id, done: item.isCompleted }}
              style={{
                width: 'match_parent',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 6,
              }}
            >
              <FlexWidget
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: item.isCompleted ? c.accent : c.faint,
                  backgroundColor: item.isCompleted ? c.accent : c.surface,
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
                  style={{ fontSize: 15, color: item.isCompleted ? c.faint : c.text }}
                />
              </FlexWidget>
              {item.currentStreak > 0 ? (
                <TextWidget
                  text={`🔥 ${item.currentStreak}`}
                  style={{ fontSize: 13, fontWeight: '700', color: c.flame, marginLeft: 8 }}
                />
              ) : null}
            </FlexWidget>
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
