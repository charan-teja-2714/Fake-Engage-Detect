import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';

export default function RoleChooserScreen() {
  const { user, logout, switchRole, startRegistration } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>
      </View>

      {/* ── Existing profiles ─────────────────────────── */}

      {user?.creatorProfileId && (
        <TouchableOpacity style={styles.card} onPress={() => switchRole('creator')}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardType}>CREATOR</Text>
            <Text style={styles.cardTitle}>Creator Dashboard</Text>
            <Text style={styles.cardDesc}>View your authenticity score and brand proposals</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      )}

      {user?.vendorProfileId && (
        <TouchableOpacity style={styles.card} onPress={() => switchRole('vendor')}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardType}>BRAND</Text>
            <Text style={styles.cardTitle}>Brand Dashboard</Text>
            <Text style={styles.cardDesc}>Browse authentic creators and send proposals</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* ── Register for a new role ────────────────────── */}

      {!user?.creatorProfileId && (
        <TouchableOpacity style={styles.newCard} onPress={() => startRegistration('creator')}>
          <Text style={styles.newCardTitle}>+ Register as Creator</Text>
          <Text style={styles.newCardDesc}>Get your authenticity score for free</Text>
        </TouchableOpacity>
      )}

      {!user?.vendorProfileId && (
        <TouchableOpacity style={styles.newCard} onPress={() => startRegistration('vendor')}>
          <Text style={styles.newCardTitle}>+ Register as Brand</Text>
          <Text style={styles.newCardDesc}>Find and collaborate with authentic creators</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  header:    { marginBottom: 32 },
  title:     { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  email:     { fontSize: 13, color: COLORS.textSub, marginTop: 4 },
  subtitle:  { fontSize: 14, color: COLORS.textSub, marginTop: 8 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft:  { flex: 1 },
  cardType:  { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  cardDesc:  { fontSize: 13, color: COLORS.textSub, lineHeight: 18 },
  arrow:     { fontSize: 20, color: COLORS.primary, marginLeft: 12 },

  newCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  newCardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textSub },
  newCardDesc:  { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  logoutBtn:  { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  logoutText: { fontSize: 14, color: COLORS.textMuted },
});
