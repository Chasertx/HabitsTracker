import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  placeholder: string;
  /** Resolve to clear the input; reject to keep the text so the user can retry. */
  onSubmit: (text: string) => Promise<void>;
  maxLength?: number;
};

/** A text field with a "+" button, used to add things to a list. */
export default function Composer({ placeholder, onSubmit, maxLength = 100 }: Props) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const canAdd = draft.trim().length > 0 && !busy;

  const submit = async () => {
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
  };

  return (
    <View style={styles.composer}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        returnKeyType="done"
        submitBehavior="submit"
        maxLength={maxLength}
      />
      <Pressable
        onPress={submit}
        disabled={!canAdd}
        style={({ pressed }) => [
          styles.addButton,
          !canAdd && styles.addButtonDisabled,
          pressed && styles.addButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add"
      >
        <Text style={styles.addIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
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
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: colors.surfaceRaised },
  addButtonPressed: { opacity: 0.8 },
  addIcon: { color: '#fff', fontSize: 28, fontWeight: '400', lineHeight: 30 },
});
