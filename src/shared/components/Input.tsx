import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, secureTextEntry, style, ...props }: InputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textLight}
          secureTextEntry={hidden}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{hidden ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  inputError: { borderColor: Colors.error },
  eyeBtn: { padding: Spacing.sm },
  eyeText: { fontSize: 18 },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
