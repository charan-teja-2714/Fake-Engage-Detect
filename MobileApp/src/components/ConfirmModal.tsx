import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

interface Action {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  actions: Action[];
  onClose: () => void;
}

export default function ConfirmModal({ visible, title, message, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  a.variant === 'primary' && styles.btnPrimary,
                  a.variant === 'danger'  && styles.btnDanger,
                  a.variant === 'ghost'   && styles.btnGhost,
                  !a.variant             && styles.btnGhost,
                ]}
                onPress={() => { a.onPress(); onClose(); }}>
                <Text style={[
                  styles.btnText,
                  a.variant === 'primary' && styles.btnTextLight,
                  a.variant === 'danger'  && styles.btnTextDanger,
                ]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.text, 
    marginBottom: 8,
    textAlign: 'center',
  },
  message: { 
    fontSize: 14, 
    color: COLORS.textSub, 
    lineHeight: 20, 
    marginBottom: 24,
    textAlign: 'center',
  },
  actions: { 
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { 
    backgroundColor: COLORS.primary,
  },
  btnDanger: { 
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.inauthentic,
  },
  btnGhost: { 
    backgroundColor: COLORS.surface,
  },
  btnText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: COLORS.text,
  },
  btnTextLight: { 
    color: COLORS.white,
  },
  btnTextDanger: { 
    color: COLORS.inauthentic,
  },
});
