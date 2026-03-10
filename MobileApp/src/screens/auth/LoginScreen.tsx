import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import AlertModal from '../../components/AlertModal';
import { useAlert } from '../../hooks/useAlert';
import { COLORS } from '../../theme/colors';
import { AuthStackParams } from '../../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParams, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({});
  const [loading,  setLoading]  = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())          e.email    = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email';
    if (!password)              e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation handled automatically by RootNavigator based on role
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Login failed. Check your credentials.';
      showAlert('Login Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>FakeEngageDetect</Text>
          <Text style={styles.tagline}>Influencer Authenticity Platform</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email}
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            error={errors.password}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>

        <AlertModal
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
        />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:    { alignItems: 'center', marginBottom: 32 },
  appName:   { fontSize: 26, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  tagline:   { fontSize: 13, color: COLORS.textSub, marginTop: 4 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  title:      { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle:   { fontSize: 14, color: COLORS.textSub, marginBottom: 24 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  footer:      { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:  { color: COLORS.textSub, fontSize: 14 },
  link:        { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
