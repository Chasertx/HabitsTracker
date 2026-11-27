import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '../theme';

type Props = {
  /** Screen-reader label and dialog title, e.g. "Add exercise". */
  label: string;
  placeholder: string;
  /** Resolve to close the dialog; reject to keep it open with the text so the user can retry. */
  onSubmit: (text: string) => Promise<void>;
  maxLength?: number;
  /** Smaller button for the navigation bar. */
  compact?: boolean;
  /** Opens the dialog whenever this changes to a new truthy value (e.g. from a deep link). */
  openRequest?: string;
};

/**
 * A "+" button that opens a small dialog to name the new thing. The keyboard's Done key
 * adds it; tapping outside the dialog (or Back) cancels.
 */
export default function AddButton({ label, placeholder, onSubmit, maxLength = 100, compact, openRequest }: Props) {
  const [open, setOpen] = useState(!!openRequest);
  const [seenRequest, setSeenRequest] = useState(openRequest);
  if (openRequest !== seenRequest) {
    setSeenRequest(openRequest);
    if (openRequest) setOpen(true);
  }
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setDraft('');
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text) return close();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(text);
      close();
    } catch {
      // Keep the dialog and text so the user can try again.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.button, compact && styles.compact, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="add" size={compact ? 26 : 32} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Cancel">
            {/* Taps inside the card must not reach the backdrop. */}
            <Pressable style={styles.card} onPress={() => {}} accessible={false}>
              <Text style={styles.title}>{label}</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                placeholder={placeholder}
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                autoFocus
                returnKeyType="done"
                submitBehavior="submit"
                maxLength={maxLength}
                editable={!busy}
              />
              <Text style={styles.hint}>Press Done to add · tap outside to cancel</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { width: 40, height: 40, borderRadius: radius.md },
  pressed: { opacity: 0.8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: 18, gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  hint: { color: colors.textFaint, fontSize: 13 },
});
