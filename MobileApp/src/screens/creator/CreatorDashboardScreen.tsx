import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import ScoreBadge from '../../components/ScoreBadge';
import ConfirmModal from '../../components/ConfirmModal';
import AlertModal from '../../components/AlertModal';
import { useAlert } from '../../hooks/useAlert';
import { getCreatorScore, ScoreResult } from '../../api/creator.api';
import { COLORS } from '../../theme/colors';

export default function CreatorDashboardScreen() {
  const { user, logout, goToChooser } = useAuth();
  const [logoutModal, setLogoutModal] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();

  const creatorId = user?.profileId ?? '';

  const [score,      setScore]      = useState<ScoreResult | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch score ────────────────────────────────────────────────────────────
  const fetchScore = useCallback(
    async (forceRefresh = false) => {
      if (!creatorId) return;
      try {
        const result = await getCreatorScore(creatorId, forceRefresh);
        setScore(result);
      } catch (err: any) {
        showAlert('Error', err?.response?.data?.message || 'Failed to load score.', 'error');
      }
    },
    [creatorId],
  );

  useEffect(() => {
    fetchScore().finally(() => setLoading(false));
  }, [fetchScore]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchScore(true);
    setRefreshing(false);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Computing your score…</Text>
      </View>
    );
  }

  const isPending = score?.authenticity_score === null;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Creator Dashboard</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={goToChooser} style={styles.switchBtn}>
            <Text style={styles.switchText}>Switch Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLogoutModal(true)} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ConfirmModal
        visible={logoutModal}
        title="Log out"
        message="You will be signed out of your account."
        onClose={() => setLogoutModal(false)}
        actions={[
          { label: 'Log out', variant: 'danger', onPress: logout },
          { label: 'Cancel',  variant: 'ghost',  onPress: () => {} },
        ]}
      />

      <AlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />

      {/* Score card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Authenticity Score</Text>

        {isPending ? (
          <View style={styles.pendingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.pendingText}>
              Scoring in progress… Pull down to refresh.
            </Text>
          </View>
        ) : (
          <ScoreBadge
            score={score?.authenticity_score ?? null}
            tier={score?.risk_level ?? null}
          />
        )}
      </View>

      {/* Component breakdown */}
      {!isPending && score && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>

          <ComponentBar
            label="Bot Detection (RF)"
            value={score.bot_probability ?? 0}
            invert
            description="Probability the account is a bot — lower is better"
          />
          <ComponentBar
            label="Anomaly Score (IF)"
            value={score.anomaly_score ?? 0}
            invert
            description="How anomalous the account's behaviour is — lower is better"
          />
          <ComponentBar
            label="Network Risk Score"
            value={score.network_score ?? 0}
            invert
            description="Clustering similarity to known bot patterns — lower is better"
          />

          {score.scored_at && (
            <Text style={styles.scoredAt}>
              Last scored: {new Date(score.scored_at).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* What this means */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What does this mean?</Text>
        <InfoRow label="Authentic (80–100)"  desc="Genuine engagement. Safe to partner with." color={COLORS.authentic} />
        <InfoRow label="Suspicious (60–79)"  desc="Some fake signals detected. Needs review." color={COLORS.suspicious} />
        <InfoRow label="Inauthentic (0–59)"  desc="Strong fake engagement indicators."         color={COLORS.inauthentic} />
      </View>

      {/* Refresh button */}
      <TouchableOpacity
        style={[styles.refreshBtn, refreshing && styles.btnDisabled]}
        onPress={onRefresh}
        disabled={refreshing}>
        <Text style={styles.refreshText}>
          {refreshing ? 'Refreshing…' : 'Re-score My Account'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function ComponentBar({
  label, value, invert, description,
}: {
  label: string;
  value: number;
  invert: boolean;
  description: string;
}) {
  const displayValue = invert ? 1 - value : value;
  const color =
    displayValue >= 0.7 ? COLORS.authentic :
    displayValue >= 0.4 ? COLORS.suspicious :
    COLORS.inauthentic;

  const pct = Math.round(value * 100);

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={barStyles.desc}>{description}</Text>
    </View>
  );
}

function InfoRow({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <View style={infoStyles.row}>
      <View style={[infoStyles.dot, { backgroundColor: color }]} />
      <View style={infoStyles.text}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSub, fontSize: 14 },
  container:   { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting:  { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  email:     { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  switchBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  switchText:{ fontSize: 13, color: COLORS.textSub, fontWeight: '600' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  logoutText:{ fontSize: 13, color: COLORS.text, fontWeight: '600' },
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
  cardTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 16 },
  pendingBox:  { alignItems: 'center', paddingVertical: 24, gap: 12 },
  pendingText: { color: COLORS.textSub, fontSize: 13, textAlign: 'center' },
  scoredAt:    { fontSize: 11, color: COLORS.textMuted, marginTop: 12, textAlign: 'right' },
  refreshBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  refreshText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});

const barStyles = StyleSheet.create({
  wrapper:  { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:    { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pct:      { fontSize: 13, fontWeight: '700' },
  track:    { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 4 },
  desc:     { fontSize: 11, color: COLORS.textSub, marginTop: 4 },
});

const infoStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  dot:   { width: 10, height: 10, borderRadius: 5, marginTop: 3, marginRight: 12 },
  text:  { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  desc:  { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
});
