import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}

export default function DateField({ label, value, onChangeText, error }: Props) {
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
    if (digits.length > 6) formatted = digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6);
    onChangeText(formatted);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.container, error ? styles.containerError : null]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="YYYY - MM - DD"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          maxLength={10}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Date</Text>
        </View>
      </View>
      <Text style={styles.hint}>e.g. 2020-03-15  (auto-formatted)</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:        { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  containerError: { borderColor: COLORS.inauthentic },
  input:  { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  badge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textSub },
  hint:      { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  error:     { fontSize: 12, color: COLORS.inauthentic, marginTop: 2 },
});
