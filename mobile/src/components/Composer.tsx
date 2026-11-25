import { useCallback, useEffect, useRef, useState } from 'react';
import { type GestureResponderEvent, Keyboard, StyleSheet, TextInput, type TextInputInstance } from 'react-native';
import { colors, radius } from '../theme';

/** Text-entry state for adding things to a list. */
export function useDraft(onSubmit: (text: string) => Promise<void>) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const canAdd = draft.trim().length > 0 && !busy;

  // onSubmit should reject to keep the text so the user can retry.
  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft('');
    try {
      await onSubmit(text);
    } catch {
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }, [draft, busy, onSubmit]);

  return { draft, setDraft, submit, canAdd };
}

export type Draft = ReturnType<typeof useDraft>;

/** The add-item field that has focus, so a tap anywhere else can cancel it. */
let focused: {
  contains: (x: number, y: number) => boolean;
  blur: () => void;
} | null = null;

/**
 * Hook up at the app root (onTouchStart): a touch outside the focused add-item field
 * closes the keyboard and throws the draft away.
 */
export function cancelDraftOnOutsideTouch(e: GestureResponderEvent) {
  const { pageX, pageY } = e.nativeEvent;
  if (focused && !focused.contains(pageX, pageY)) focused.blur();
}

/**
 * Text field for adding things: type a name and press the keyboard's Done key to add it.
 * Tapping anywhere else (or closing the keyboard) cancels and clears the draft.
 */
export function DraftInput({
  draft,
  placeholder,
  maxLength = 100,
}: {
  draft: Draft;
  placeholder: string;
  maxLength?: number;
}) {
  const ref = useRef<TextInputInstance>(null);
  const rect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const { setDraft } = draft;

  const blur = useCallback(() => ref.current?.blur(), []);

  // The Android back key hides the keyboard without blurring; treat that as a cancel too.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', blur);
    return () => sub.remove();
  }, [blur]);

  const onFocus = () => {
    ref.current?.measureInWindow((x, y, w, h) => (rect.current = { x, y, w, h }));
    focused = {
      contains: (px, py) => {
        const r = rect.current;
        return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
      },
      blur,
    };
  };

  const onBlur = () => {
    if (focused?.blur === blur) focused = null;
    setDraft('');
  };

  return (
    <TextInput
      ref={ref}
      value={draft.draft}
      onChangeText={setDraft}
      onSubmitEditing={draft.submit}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={styles.input}
      returnKeyType="done"
      submitBehavior="blurAndSubmit"
      maxLength={maxLength}
    />
  );
}

type Props = {
  placeholder: string;
  /** Resolve to clear the input; reject to keep the text so the user can retry. */
  onSubmit: (text: string) => Promise<void>;
  maxLength?: number;
};

/** An add-item text field; Done adds, tapping elsewhere cancels. */
export default function Composer({ placeholder, onSubmit, maxLength }: Props) {
  const draft = useDraft(onSubmit);
  return <DraftInput draft={draft} placeholder={placeholder} maxLength={maxLength} />;
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
});
