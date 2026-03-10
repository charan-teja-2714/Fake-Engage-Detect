import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { SetupStackParams } from '../../navigation/RootNavigator';
import { COLORS } from '../../theme/colors';

type NavProp = NativeStackNavigationProp<SetupStackParams, 'RoleSelect'>;

export default function RoleSelectScreen() {
  const { logout } = useAuth();
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Choose your role to continue</Text>
      </View>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CreatorRegistration')}>
        <Text style={styles.cardTitle}>I'm a Creator</Text>
        <Text style={styles.cardDesc}>
          I create content and want my authenticity scored so brands can find and trust me.
        </Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VendorRegistration')}>
        <Text style={styles.cardTitle}>I'm a Brand / Vendor</Text>
        <Text style={styles.cardDesc}>
          I represent a brand and want to discover authentic creators for campaigns.
        </Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  header:     { marginBottom: 32 },
  title:      { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  subtitle:   { fontSize: 14, color: COLORS.textSub, marginTop: 6 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  cardDesc:   { fontSize: 13, color: COLORS.textSub, lineHeight: 20 },
  arrow:      { fontSize: 18, color: COLORS.primary, marginTop: 12, textAlign: 'right' },
  logoutBtn:  { marginTop: 24, alignItems: 'center' },
  logoutText: { fontSize: 14, color: COLORS.textMuted },
});
