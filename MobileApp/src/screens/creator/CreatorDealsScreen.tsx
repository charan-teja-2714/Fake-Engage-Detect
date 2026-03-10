import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getCreatorProposals, updateProposalStatus, PromotionRequest } from '../../api/promotion.api';
import { COLORS } from '../../theme/colors';

export default function CreatorDealsScreen() {
  const { user } = useAuth();
  const [proposals,  setProposals]  = useState<PromotionRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating,   setUpdating]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getCreatorProposals(user.idToken);
      setProposals(data);
    } catch {
      Alert.alert('Error', 'Failed to load proposals');
    }
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    if (!user) return;
    setUpdating(requestId);
    try {
      const updated = await updateProposalStatus(user.idToken, requestId, status);
      setProposals(prev => prev.map(p => p._id === requestId ? updated : p));
    } catch {
      Alert.alert('Error', 'Failed to update proposal');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.container}
      data={proposals}
      keyExtractor={item => item._id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Brand Proposals</Text>
          <Text style={styles.subtitle}>
            {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No proposals yet.</Text>
          <Text style={styles.emptySubtext}>Brands will send collaboration requests here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ProposalCard
          proposal={item}
          onAccept={() => handleStatus(item._id, 'accepted')}
          onReject={() => handleStatus(item._id, 'rejected')}
          updating={updating === item._id}
        />
      )}
    />
  );
}

function ProposalCard({
  proposal, onAccept, onReject, updating,
}: {
  proposal: PromotionRequest;
  onAccept: () => void;
  onReject: () => void;
  updating: boolean;
}) {
  const vendor = typeof proposal.vendor === 'object' ? proposal.vendor : null;

  const statusColor =
    proposal.status === 'accepted' ? COLORS.authentic :
    proposal.status === 'rejected' ? COLORS.inauthentic :
    COLORS.suspicious;

  return (
    <View style={card.container}>
      <View style={card.row}>
        <Text style={card.campaign}>{proposal.campaignTitle}</Text>
        <View style={[card.badge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <Text style={[card.badgeText, { color: statusColor }]}>{proposal.status}</Text>
        </View>
      </View>

      {vendor && (
        <Text style={card.vendor}>{vendor.businessName} · {vendor.industry}</Text>
      )}

      <Text style={card.message}>{proposal.message}</Text>

      <Text style={card.budget}>Budget: ₹{proposal.proposedBudget.toLocaleString()}</Text>

      {proposal.status === 'pending' && (
        <View style={card.actions}>
          {updating ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
          ) : (
            <>
              <TouchableOpacity style={card.acceptBtn} onPress={onAccept}>
                <Text style={card.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={card.rejectBtn} onPress={onReject}>
                <Text style={card.rejectText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:   { padding: 20, paddingBottom: 40 },
  header:      { marginBottom: 20 },
  title:       { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  subtitle:    { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 16, fontWeight: '600', color: COLORS.textSub },
  emptySubtext:{ fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  campaign:  { fontSize: 15, fontWeight: '700', color: COLORS.primary, flex: 1, marginRight: 8 },
  badge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  vendor:    { fontSize: 12, color: COLORS.textSub, marginBottom: 8 },
  message:   { fontSize: 13, color: COLORS.text, lineHeight: 20, marginBottom: 10 },
  budget:    { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 14 },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptText:{ fontSize: 14, fontWeight: '700', color: COLORS.white },
  rejectBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rejectText:{ fontSize: 14, fontWeight: '600', color: COLORS.text },
});
