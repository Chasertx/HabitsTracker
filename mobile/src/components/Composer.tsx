import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

/**
 * Text-entry state for adding things to a list. The input and the "+" button take the
 * same draft so they can be placed apart (e.g. "+" in a screen header).
 */
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

export function DraftInput({
  draft,
  placeholder,
  maxLength = 100,
}: {
  draft: Draft;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <TextInput
      value={draft.draft}
      onChangeText={draft.setDraft}
      onSubmitEditing={draft.submit}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={styles.input}
      returnKeyType="done"
      submitBehavior="submit"
      maxLength={maxLength}
    />
  );
}

export function AddButton({ draft, label = 'Add' }: { draft: Draft; label?: string }) {
  return (
    <Pressable
      onPress={draft.submit}
      disabled={!draft.canAdd}
      style={({ pressed }) => [
        styles.addButton,
        !draft.canAdd && styles.addButtonDisabled,
        pressed && styles.addButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !draft.canAdd }}
    >
      <Text style={styles.addIcon}>+</Text>
    </Pressable>
  );
}

type Props = {
  placeholder: string;
  /** Resolve to clear the input; reject to keep the text so the user can retry. */
  onSubmit: (text: string) => Promise<void>;
  maxLength?: number;
};

/** A text field with a "+" button beside it. */
export default function Composer({ placeholder, onSubmit, maxLength }: Props) {
  const draft = useDraft(onSubmit);
  return (
    <View style={styles.composer}>
      <View style={styles.flex}>
        <DraftInput draft={draft} placeholder={placeholder} maxLength={maxLength} />
      </View>
      <AddButton draft={draft} />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
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
  addButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: colors.surfaceRaised },
  addButtonPressed: { opacity: 0.8 },
  addIcon: { color: '#fff', fontSize: 30, fontWeight: '400', lineHeight: 32 },
});
