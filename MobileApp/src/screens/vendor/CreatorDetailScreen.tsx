import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { getCreatorProfileAsVendor, saveCreator } from '../../api/vendor.api';
import { CreatorProfile } from '../../api/creator.api';
import { VendorStackParams } from '../../navigation/RootNavigator';
import { COLORS } from '../../theme/colors';

type Props = NativeStackScreenProps<VendorStackParams, 'CreatorDetail'>;

export default function CreatorDetailScreen({ route, navigation }: Props) {
  const { creatorId } = route.params;
  const { user } = useAuth();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const data = await getCreatorProfileAsVendor(user.idToken, creatorId);
        setCreator(data);
      } catch {
        Alert.alert('Error', 'Failed to load creator profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [creatorId, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveCreator(user.idToken, creatorId);
      Alert.alert('Saved', 'Creator saved to your list.');
    } catch {
      Alert.alert('Error', 'Could not save creator.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!creator) return null;

  const tierColor =
    creator.riskLevel === 'Authentic'   ? COLORS.authentic :
    creator.riskLevel === 'Suspicious'  ? COLORS.suspicious :
    creator.riskLevel === 'Inauthentic' ? COLORS.inauthentic :
    COLORS.textMuted;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

      {/* Profile header */}
      <View style={styles.card}>
        <Text style={styles.name}>{creator.name}</Text>
        <Text style={styles.meta}>{creator.niche} · {creator.country}</Text>
        <Text style={styles.price}>₹{creator.pricePerPost.toLocaleString()} / post</Text>

        {creator.authenticityScore !== null && (
          <View style={[styles.scoreBadge, { borderColor: tierColor, backgroundColor: tierColor + '18' }]}>
            <Text style={[styles.scoreNum, { color: tierColor }]}>{creator.authenticityScore}</Text>
            <Text style={[styles.scoreTier, { color: tierColor }]}>{creator.riskLevel}</Text>
          </View>
        )}
      </View>

      {/* ML Breakdown */}
      {creator.mlDetails && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          <InfoRow label="Bot Probability" value={`${Math.round(creator.mlDetails.bot_probability * 100)}%`} />
          <InfoRow label="Anomaly Score"   value={`${Math.round(creator.mlDetails.anomaly_score * 100)}%`} />
          <InfoRow label="Network Risk"    value={`${Math.round(creator.mlDetails.network_score * 100)}%`} />
          <Text style={styles.scoredAt}>
            Scored: {new Date(creator.mlDetails.scoredAt).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Platforms */}
      {creator.platforms && (creator.platforms.instagram || creator.platforms.youtube) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Platforms</Text>
          {creator.platforms.instagram && (
            <InfoRow
              label="Instagram"
              value={`@${creator.platforms.instagram.username} · ${creator.platforms.instagram.followers.toLocaleString()} followers`}
            />
          )}
          {creator.platforms.youtube && (
            <InfoRow
              label="YouTube"
              value={`${creator.platforms.youtube.channelName} · ${creator.platforms.youtube.subscribers.toLocaleString()} subs`}
            />
          )}
        </View>
      )}

      {/* Actions */}
      <TouchableOpacity
        style={[styles.btn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}>
        {saving
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.btnText}>Save Creator</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.proposalBtn}
        onPress={() => navigation.navigate('SendProposal', { creatorId, creatorName: creator.name })}>
        <Text style={styles.proposalText}>Send Proposal</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={row.container}>
      <Text style={row.label}>{label}</Text>
      <Text style={row.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:   { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.white, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  name:        { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  meta:        { fontSize: 13, color: COLORS.textSub, marginTop: 4 },
  price:       { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  scoreBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  scoreNum:    { fontSize: 24, fontWeight: '800' },
  scoreTier:   { fontSize: 14, fontWeight: '600' },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  scoredAt:    { fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'right' },
  btn:         { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  proposalBtn: { backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  proposalText:{ color: COLORS.primary, fontSize: 15, fontWeight: '700' },
});

const row = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label:     { fontSize: 13, color: COLORS.textSub, flex: 1 },
  value:     { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 2, textAlign: 'right' },
});
