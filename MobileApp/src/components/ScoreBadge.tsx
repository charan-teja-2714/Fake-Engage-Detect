import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

type Tier = 'Authentic' | 'Suspicious' | 'Inauthentic' | null;

interface Props {
  score: number | null;
  tier: Tier;
}

const TIER_COLOR: Record<NonNullable<Tier>, string> = {
  Authentic:   COLORS.authentic,
  Suspicious:  COLORS.suspicious,
  Inauthentic: COLORS.inauthentic,
};

const TIER_BG: Record<NonNullable<Tier>, string> = {
  Authentic:   '#E8F8F0',
  Suspicious:  '#FEF3E2',
  Inauthentic: '#FDEDEC',
};

export default function ScoreBadge({ score, tier }: Props) {
  const color  = tier ? TIER_COLOR[tier] : COLORS.textMuted;
  const bgColor = tier ? TIER_BG[tier]  : '#F0F0F0';

  return (
    <View style={styles.container}>
      {/* Score circle */}
      <View style={[styles.circle, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>
          {score !== null ? score : '—'}
        </Text>
        <Text style={[styles.scoreLabel, { color }]}>/100</Text>
      </View>

      {/* Tier badge */}
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color }]}>
          {tier ?? 'Not scored yet'}
        </Text>
      </View>

      {/* Description */}
      {tier && (
        <Text style={styles.description}>
          {tier === 'Authentic'
            ? 'This creator shows strong signs of genuine engagement.'
            : tier === 'Suspicious'
            ? 'Some signals of inauthentic engagement detected.'
            : 'Strong indicators of fake or bought engagement.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { alignItems: 'center', paddingVertical: 20 },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreNumber:  { fontSize: 48, fontWeight: '800' },
  scoreLabel:   { fontSize: 14, fontWeight: '500', marginTop: -4 },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText:    { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  description:  {
    fontSize: 13,
    color: COLORS.textSub,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
