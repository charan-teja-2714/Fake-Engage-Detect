import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import SelectField from '../../components/SelectField';
import { registerVendor } from '../../api/vendor.api';
import { COLORS } from '../../theme/colors';

const INDUSTRIES = [
  'Fashion & Apparel', 'Beauty & Cosmetics', 'Food & Beverage',
  'Technology', 'Gaming', 'Health & Wellness', 'Travel & Tourism',
  'Finance & Banking', 'Education', 'Entertainment & Media',
  'Sports', 'Home & Lifestyle', 'Automotive', 'Real Estate',
  'E-commerce', 'Pharmaceuticals', 'FMCG', 'Jewellery & Accessories',
  'Agriculture', 'Other',
];

const COUNTRIES = [
  'India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France',
  'UAE', 'Singapore', 'Japan', 'South Korea', 'Brazil', 'Indonesia',
  'Pakistan', 'Bangladesh', 'Nigeria', 'Kenya', 'South Africa',
  'Malaysia', 'Philippines', 'Italy', 'Spain', 'Netherlands',
  'Sweden', 'Switzerland', 'Thailand', 'Vietnam', 'Egypt', 'Mexico',
  'Saudi Arabia', 'Turkey', 'China', 'Sri Lanka', 'Nepal', 'Other',
];

export default function VendorRegistrationScreen() {
  const { user, completeProfile, goToChooser } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [industry,     setIndustry]     = useState('');
  const [country,      setCountry]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!businessName.trim()) e.businessName = 'Required';
    if (!industry)            e.industry     = 'Required';
    if (!country)             e.country      = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const vendor = await registerVendor(user.idToken, { businessName: businessName.trim(), industry, country });
      await completeProfile('vendor', vendor._id);
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.message || '';
      // Auto-recover: if vendor already exists for this Firebase account, just restore it
      if (msg.toLowerCase().includes('already') && user) {
        try {
          const { fetchMe } = await import('../../api/auth.api');
          const me = await fetchMe(user.idToken);
          if (me.profileId) { await completeProfile('vendor', me.profileId); return; }
        } catch { /* fall through */ }
      }
      Alert.alert('Error', msg || 'Registration failed. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasOtherProfiles = !!(user?.creatorProfileId || user?.vendorProfileId);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {hasOtherProfiles && (
        <TouchableOpacity onPress={goToChooser} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Options</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <InputField
          label="Business Name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Acme Corp"
          error={errors.businessName}
        />
        <SelectField
          label="Industry"
          value={industry}
          options={INDUSTRIES}
          onSelect={setIndustry}
          error={errors.industry}
        />
        <SelectField
          label="Country"
          value={country}
          options={COUNTRIES}
          onSelect={setCountry}
          error={errors.country}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}>
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.submitText}>Create Account</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: COLORS.background },
  container:  { padding: 24, paddingBottom: 40 },
  backBtn:    { marginBottom: 16 },
  backText:   { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  submitText:  { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
