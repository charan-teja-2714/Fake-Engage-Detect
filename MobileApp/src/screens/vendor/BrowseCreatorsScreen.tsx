import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { searchCreators } from '../../api/vendor.api';
import { CreatorListItem } from '../../api/creator.api';
import { VendorStackParams } from '../../navigation/RootNavigator';
import ConfirmModal from '../../components/ConfirmModal';
import { COLORS } from '../../theme/colors';

type NavProp = NativeStackNavigationProp<VendorStackParams>;

export default function BrowseCreatorsScreen() {
  const { user, logout, goToChooser } = useAuth();
  const [logoutModal, setLogoutModal] = useState(false);

  const navigation = useNavigation<NavProp>();

  const [creators,   setCreators]   = useState<CreatorListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keyword,    setKeyword]    = useState('');

  const load = useCallback(async (kw?: string) => {
    if (!user) return;
    try {
      const result = await searchCreators(user.idToken, kw ? { keyword: kw } : undefined);
      setCreators(result.data);
    } catch {
      // silent fail — list stays as-is
    }
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(keyword || undefined);
    setRefreshing(false);
  };

  const handleSearch = () => load(keyword || undefined);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Browse Creators</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
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

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or niche…"
          placeholderTextColor={COLORS.textMuted}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={creators}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No creators found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CreatorDetail', { creatorId: item._id })}>
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.niche} · {item.country}</Text>
              </View>
              {item.authenticityScore !== null && item.riskLevel && (
                <ScoreChip score={item.authenticityScore} tier={item.riskLevel} />
              )}
            </View>
            <Text style={styles.price}>₹{item.pricePerPost.toLocaleString()} / post</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function ScoreChip({
  score, tier,
}: { score: number; tier: 'Authentic' | 'Suspicious' | 'Inauthentic' }) {
  const color =
    tier === 'Authentic'   ? COLORS.authentic :
    tier === 'Suspicious'  ? COLORS.suspicious :
    COLORS.inauthentic;

  return (
    <View style={[chip.container, { borderColor: color, backgroundColor: color + '18' }]}>
      <Text style={[chip.score, { color }]}>{score}</Text>
      <Text style={[chip.label, { color }]}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title:       { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  subtitle:    { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  switchBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  switchText:  { fontSize: 13, color: COLORS.textSub, fontWeight: '600' },
  logoutBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  logoutText:  { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  searchRow:   { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  searchInput: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  searchBtn:   { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  searchBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  list:        { paddingHorizontal: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft:    { flex: 1, marginRight: 10 },
  name:        { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  meta:        { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  price:       { fontSize: 13, color: COLORS.textSub },
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 16, color: COLORS.textSub },
});

const chip = StyleSheet.create({
  container: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', minWidth: 70 },
  score:     { fontSize: 16, fontWeight: '800' },
  label:     { fontSize: 10, fontWeight: '600' },
});
