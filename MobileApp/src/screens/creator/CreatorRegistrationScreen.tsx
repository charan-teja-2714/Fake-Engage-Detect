import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import SelectField from '../../components/SelectField';
import DateField from '../../components/DateField';
import { registerCreator } from '../../api/creator.api';
import { COLORS } from '../../theme/colors';

const NICHES = [
  'Fashion', 'Beauty', 'Food & Cooking', 'Travel', 'Fitness & Health',
  'Technology', 'Gaming', 'Finance & Business', 'Education',
  'Comedy & Entertainment', 'Music', 'Sports', 'Lifestyle',
  'Photography', 'Art & Design', 'Parenting', 'Pets & Animals',
  'Automotive', 'Science', 'Spirituality & Wellness', 'Other',
];

const COUNTRIES = [
  'India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France',
  'UAE', 'Singapore', 'Japan', 'South Korea', 'Brazil', 'Indonesia',
  'Pakistan', 'Bangladesh', 'Nigeria', 'Kenya', 'South Africa',
  'Malaysia', 'Philippines', 'Italy', 'Spain', 'Netherlands',
  'Sweden', 'Switzerland', 'Thailand', 'Vietnam', 'Egypt', 'Mexico',
  'Saudi Arabia', 'Turkey', 'China', 'Sri Lanka', 'Nepal', 'Other',
];

export default function CreatorRegistrationScreen() {
  const { user, completeProfile, goToChooser } = useAuth();

  const [name,         setName]         = useState('');
  const [niche,        setNiche]        = useState('');
  const [country,      setCountry]      = useState('');
  const [pricePerPost, setPricePerPost] = useState('');

  const [followers,     setFollowers]     = useState('');
  const [following,     setFollowing]     = useState('');
  const [posts,         setPosts]         = useState('');
  const [likes,         setLikes]         = useState('');
  const [accountDate,   setAccountDate]   = useState('');
  const [screenName,    setScreenName]    = useState('');
  const [isVerified,    setIsVerified]    = useState(false);
  const [hasProfileImg, setHasProfileImg] = useState(true);
  const [hasDesc,       setHasDesc]       = useState(true);
  const [hasUrl,        setHasUrl]        = useState(false);

  const [igUsername,  setIgUsername]  = useState('');
  const [igFollowers, setIgFollowers] = useState('');
  const [ytChannel,   setYtChannel]   = useState('');
  const [ytSubs,      setYtSubs]      = useState('');

  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())                              e.name         = 'Required';
    if (!niche)                                    e.niche        = 'Required';
    if (!country)                                  e.country      = 'Required';
    if (!pricePerPost || isNaN(Number(pricePerPost))) e.pricePerPost = 'Enter a valid number';
    if (!followers || isNaN(Number(followers)))    e.followers    = 'Enter a valid number';
    if (!following || isNaN(Number(following)))    e.following    = 'Enter a valid number';
    if (!posts     || isNaN(Number(posts)))        e.posts        = 'Enter a valid number';
    if (!likes     || isNaN(Number(likes)))        e.likes        = 'Enter a valid number';
    if (!accountDate.trim())                       e.accountDate  = 'Required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(accountDate)) e.accountDate = 'Format: YYYY-MM-DD';
    if (!screenName.trim())                        e.screenName   = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const platforms: any = {};
      if (igUsername.trim()) {
        platforms.instagram = { username: igUsername.trim(), followers: Number(igFollowers) || 0, engagementRate: 0 };
      }
      if (ytChannel.trim()) {
        platforms.youtube = { channelName: ytChannel.trim(), subscribers: Number(ytSubs) || 0, avgViews: 0 };
      }

      const creator = await registerCreator(user.idToken, {
        name: name.trim(),
        niche,
        country,
        pricePerPost: Number(pricePerPost),
        socialStats: {
          totalFollowers:   Number(followers),
          totalFollowing:   Number(following),
          totalPosts:       Number(posts),
          totalLikes:       Number(likes),
          accountCreatedAt: accountDate.trim(),
          isVerified,
          hasProfileImage:  hasProfileImg,
          hasDescription:   hasDesc,
          hasUrl,
          screenName:       screenName.trim(),
        },
        ...(Object.keys(platforms).length > 0 && { platforms }),
      });

      await completeProfile('creator', creator._id);
    } catch (err: any) {
      console.log('CREATOR REG ERROR:', JSON.stringify(err?.response?.data ?? err?.message ?? err));
      const msg: string = err?.response?.data?.message || err?.message || '';
      // Auto-recover: if creator already exists for this Firebase account, just restore it
      if (msg.toLowerCase().includes('already') && user) {
        try {
          const { fetchMe } = await import('../../api/auth.api');
          const me = await fetchMe(user.idToken);
          if (me.profileId) { await completeProfile('creator', me.profileId); return; }
        } catch { /* fall through to error */ }
      }
      Alert.alert('Error', msg || 'Registration failed. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasOtherProfiles = !!(user?.creatorProfileId || user?.vendorProfileId);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">

      {hasOtherProfiles && (
        <TouchableOpacity onPress={goToChooser} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Options</Text>
        </TouchableOpacity>
      )}

      <SectionCard title="Basic Information">
        <InputField label="Full Name"              value={name}         onChangeText={setName}         placeholder="Riya Sharma"  error={errors.name} />
        <SelectField label="Niche / Category"      value={niche}        options={NICHES}               onSelect={setNiche}        error={errors.niche} />
        <SelectField label="Country"               value={country}      options={COUNTRIES}            onSelect={setCountry}      error={errors.country} />
        <InputField  label="Price per Post (₹ / $)" value={pricePerPost} onChangeText={setPricePerPost} keyboardType="numeric" placeholder="5000" error={errors.pricePerPost} />
      </SectionCard>

      <SectionCard title="Social Media Statistics">
        <Text style={styles.hint}>These numbers are used to compute your authenticity score. Be accurate.</Text>
        <InputField label="Total Followers"       value={followers}  onChangeText={setFollowers}  keyboardType="numeric" placeholder="85000"       error={errors.followers} />
        <InputField label="Total Following"       value={following}  onChangeText={setFollowing}  keyboardType="numeric" placeholder="320"         error={errors.following} />
        <InputField label="Total Posts"           value={posts}      onChangeText={setPosts}      keyboardType="numeric" placeholder="1200"        error={errors.posts} />
        <InputField label="Total Likes Given"     value={likes}      onChangeText={setLikes}      keyboardType="numeric" placeholder="62000"       error={errors.likes} />
        <DateField  label="Account Created Date"  value={accountDate} onChangeText={setAccountDate}                                                 error={errors.accountDate} />
        <InputField label="Screen Name / Handle"  value={screenName} onChangeText={setScreenName}              placeholder="riya_sharma"           error={errors.screenName} />

        <ToggleRow label="Verified account?"       value={isVerified}    onToggle={setIsVerified} />
        <ToggleRow label="Has profile picture?"     value={hasProfileImg} onToggle={setHasProfileImg} />
        <ToggleRow label="Has bio / description?"   value={hasDesc}       onToggle={setHasDesc} />
        <ToggleRow label="Has website link in bio?" value={hasUrl}        onToggle={setHasUrl} />
      </SectionCard>

      <SectionCard title="Platform Details (Optional)">
        <Text style={styles.hint}>Leave blank if not applicable.</Text>
        <InputField label="Instagram Username"  value={igUsername}  onChangeText={setIgUsername}  placeholder="@riya_sharma" />
        <InputField label="Instagram Followers" value={igFollowers} onChangeText={setIgFollowers} keyboardType="numeric" placeholder="80000" />
        <InputField label="YouTube Channel"     value={ytChannel}   onChangeText={setYtChannel}   placeholder="Riya Sharma" />
        <InputField label="YouTube Subscribers" value={ytSubs}      onChangeText={setYtSubs}      keyboardType="numeric" placeholder="45000" />
      </SectionCard>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}>
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.submitText}>Submit & Get Scored</Text>
        }
      </TouchableOpacity>

      <Text style={styles.scoreNote}>Your authenticity score will be computed after submission.</Text>

    </ScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.container}>
      <Text style={cardStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={toggleStyles.row}>
      <Text style={toggleStyles.label}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: COLORS.authentic, false: COLORS.border }} thumbColor={COLORS.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: COLORS.background },
  container:  { padding: 20, paddingBottom: 40 },
  backBtn:    { marginBottom: 16 },
  backText:   { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },
  hint:       { fontSize: 12, color: COLORS.textSub, marginBottom: 14, lineHeight: 18 },
  submitBtn:  { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled:{ opacity: 0.6 },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  scoreNote:  { fontSize: 12, color: COLORS.textSub, textAlign: 'center', marginTop: 12 },
});

const cardStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.white, borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 14 },
});

const toggleStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  label: { fontSize: 14, color: COLORS.text, flex: 1 },
});
