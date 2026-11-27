import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { api, type ListItem } from '../api';
import { RoutineWidget } from './RoutineWidget';

export const ROUTINE_WIDGET = 'Routine';

/** Runs in the background when the widget is added, updated, resized or tapped. */
export async function widgetTaskHandler({
  widgetAction,
  clickAction,
  clickActionData,
  renderWidget,
}: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE' && clickActionData) {
    const id = Number(clickActionData.id);
    try {
      await api.items.setCompleted(id, !clickActionData.done);
    } catch {
      // Fall through and redraw with whatever the server has.
    }
  }

  try {
    renderWidget(<RoutineWidget items={await api.items.list()} />);
  } catch {
    renderWidget(<RoutineWidget items={null} error />);
  }
}

/** Redraws every Routine widget with the given items (call after changes in the app). */
export function updateRoutineWidget(items: ListItem[]) {
  requestWidgetUpdate({ widgetName: ROUTINE_WIDGET, renderWidget: () => <RoutineWidget items={items} /> }).catch(
    () => {},
  );
}
