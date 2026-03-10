import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, TextInput,
} from 'react-native';
import { COLORS } from '../theme/colors';

interface Props {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onSelect: (value: string) => void;
  error?: string;
}

export default function SelectField({ label, value, options, placeholder, onSelect, error }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, error ? styles.inputError : null]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder || `Select ${label}`}
        </Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { setSearch(''); setOpen(false); }} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {options.length > 8 && (
              <TextInput
                style={styles.search}
                placeholder="Search…"
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            )}

            <FlatList
              data={filtered}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item === value && styles.optionSelected]}
                  onPress={() => { onSelect(item); setSearch(''); setOpen(false); }}>
                  <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>
                    {item}
                  </Text>
                  {item === value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  inputError:  { borderColor: COLORS.inauthentic },
  value:       { fontSize: 15, color: COLORS.text, flex: 1 },
  placeholder: { color: COLORS.textMuted },
  arrow:       { fontSize: 14, color: COLORS.textMuted, marginLeft: 8 },
  errorText:   { fontSize: 12, color: COLORS.inauthentic, marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  closeBtn:    { padding: 4 },
  closeText:   { fontSize: 18, color: COLORS.textSub },
  search: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  optionSelected:     { backgroundColor: COLORS.surface },
  optionText:         { fontSize: 15, color: COLORS.text },
  optionTextSelected: { fontWeight: '700', color: COLORS.primary },
  check:              { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});
