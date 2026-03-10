import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { sendProposal } from '../../api/promotion.api';
import InputField from '../../components/InputField';
import AlertModal from '../../components/AlertModal';
import { useAlert } from '../../hooks/useAlert';
import { VendorStackParams } from '../../navigation/RootNavigator';
import { COLORS } from '../../theme/colors';

type Props = NativeStackScreenProps<VendorStackParams, 'SendProposal'>;

export default function SendProposalScreen({ route, navigation }: Props) {
  const { creatorId, creatorName } = route.params;
  const { user } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();

  const [campaignTitle, setCampaignTitle] = useState('');
  const [message,       setMessage]       = useState('');
  const [budget,        setBudget]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!campaignTitle.trim()) e.campaignTitle = 'Required';
    if (!message.trim())       e.message       = 'Required';
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0)
                               e.budget        = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      await sendProposal(user.idToken, {
        creatorId,
        campaignTitle: campaignTitle.trim(),
        message:       message.trim(),
        proposedBudget: Number(budget),
      });
      showAlert('Sent!', 'Your proposal has been sent to the creator.', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err: any) {
      showAlert('Error', err?.response?.data?.message || 'Failed to send proposal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">

      <View style={styles.toRow}>
        <Text style={styles.toLabel}>To:</Text>
        <Text style={styles.toName}>{creatorName}</Text>
      </View>

      <View style={styles.card}>
        <InputField
          label="Campaign Title"
          value={campaignTitle}
          onChangeText={setCampaignTitle}
          placeholder="Summer Sale Campaign"
          error={errors.campaignTitle}
        />
        <InputField
          label="Message to Creator"
          value={message}
          onChangeText={setMessage}
          placeholder="Hi, we'd love to collaborate on…"
          multiline
          numberOfLines={4}
          error={errors.message}
        />
        <InputField
          label="Proposed Budget (₹)"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          placeholder="10000"
          error={errors.budget}
        />
      </View>

      <TouchableOpacity
        style={[styles.sendBtn, loading && styles.btnDisabled]}
        onPress={handleSend}
        disabled={loading}>
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.sendText}>Send Proposal</Text>
        }
      </TouchableOpacity>

      <AlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.background },
  container:   { padding: 20, paddingBottom: 40 },
  toRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  toLabel:     { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },
  toName:      { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  card:        { backgroundColor: COLORS.white, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  sendText:    { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
