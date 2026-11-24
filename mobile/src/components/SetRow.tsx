import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { ExerciseSet } from '../api';
import { colors, radius } from '../theme';
import DeleteButton from './DeleteButton';

type Props = {
  set: ExerciseSet;
  index: number;
  onChange: (set: ExerciseSet, values: { reps?: number; weight?: number }) => void;
  onDelete: (set: ExerciseSet) => void;
};

const formatWeight = (w: number) => String(Math.round(w * 100) / 100);

/** Returns the reps typed, or null if the text isn't a valid rep count. */
const parseReps = (text: string) => {
  const value = parseInt(text, 10);
  return Number.isNaN(value) || value < 0 || value > 1000 ? null : value;
};

/** Returns the weight typed (accepting a decimal comma), or null if invalid. */
const parseWeight = (text: string) => {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isNaN(value) || value < 0 || value > 10000 ? null : value;
};

/** One set: editable reps and weight, saved when a field loses focus or the row goes away. */
function SetRow({ set, index, onChange, onDelete }: Props) {
  const [reps, setReps] = useState(String(set.reps));
  const [weight, setWeight] = useState(formatWeight(set.weight));

  // Latest values for the unmount save below; an edit can still be in progress when the
  // user navigates away, in which case the field never reports that editing ended.
  const pending = useRef({ reps, weight, set, onChange, deleted: false });
  useEffect(() => {
    pending.current.set = set;
    pending.current.onChange = onChange;
  }, [set, onChange]);
  useEffect(
    () => () => {
      const { reps: r, weight: w, set: current, onChange: save, deleted } = pending.current;
      if (deleted) return;
      const values: { reps?: number; weight?: number } = {};
      const repsValue = parseReps(r);
      const weightValue = parseWeight(w);
      if (repsValue !== null && repsValue !== current.reps) values.reps = repsValue;
      if (weightValue !== null && weightValue !== current.weight) values.weight = weightValue;
      if (values.reps !== undefined || values.weight !== undefined) save(current, values);
    },
    [],
  );

  const changeReps = (text: string) => {
    pending.current.reps = text;
    setReps(text);
  };
  const changeWeight = (text: string) => {
    pending.current.weight = text;
    setWeight(text);
  };

  const commitReps = () => {
    const value = parseReps(reps);
    const text = String(value ?? set.reps);
    changeReps(text);
    if (value !== null && value !== set.reps) onChange(set, { reps: value });
  };

  const commitWeight = () => {
    const value = parseWeight(weight);
    const text = formatWeight(value ?? set.weight);
    changeWeight(text);
    if (value !== null && value !== set.weight) onChange(set, { weight: value });
  };

  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>
      <TextInput
        value={reps}
        onChangeText={changeReps}
        onEndEditing={commitReps}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={4}
        style={styles.input}
        accessibilityLabel={`Set ${index + 1} reps`}
      />
      <TextInput
        value={weight}
        onChangeText={changeWeight}
        onEndEditing={commitWeight}
        keyboardType="decimal-pad"
        selectTextOnFocus
        maxLength={7}
        style={styles.input}
        accessibilityLabel={`Set ${index + 1} weight`}
      />
      <View style={setColumns.action}>
        <DeleteButton
          onConfirm={() => {
            // Skip the unmount save: this set is about to stop existing.
            pending.current.deleted = true;
            onDelete(set);
          }}
          label={`Remove set ${index + 1}`}
        />
      </View>
    </View>
  );
}

export default memo(SetRow);

/** Column widths shared with the table header in the exercise screen. */
export const setColumns = StyleSheet.create({
  set: { width: 36, alignItems: 'center' },
  value: { flex: 1 },
  action: { width: 36 },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badge: {
    ...setColumns.set,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
  },
  badgeText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  input: {
    ...setColumns.value,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
