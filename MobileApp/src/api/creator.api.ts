import axios from 'axios';
import { BASE_URL } from './config';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface SocialStats {
  totalFollowers: number;
  totalFollowing: number;
  totalPosts: number;
  totalLikes: number;
  accountCreatedAt: string;
  isVerified: boolean;
  hasProfileImage: boolean;
  hasDescription: boolean;
  hasUrl: boolean;
  screenName: string;
}

export interface CreatorProfile {
  _id: string;
  uid: string;
  email: string;
  name: string;
  niche: string;
  country: string;
  pricePerPost: number;
  platforms?: {
    instagram?: { username: string; followers: number; engagementRate: number };
    youtube?: { channelName: string; subscribers: number; avgViews: number };
  };
  authenticityScore: number | null;
  riskLevel: 'Authentic' | 'Suspicious' | 'Inauthentic' | null;
  mlDetails?: {
    bot_probability: number;
    anomaly_score: number;
    network_score: number;
    scoredAt: string;
  };
  isVerified: boolean;
  createdAt: string;
}

export interface ScoreResult {
  authenticity_score: number | null;
  risk_level: 'Authentic' | 'Suspicious' | 'Inauthentic' | null;
  bot_probability: number | null;
  anomaly_score: number | null;
  network_score: number | null;
  component_bot: number | null;
  component_anomaly: number | null;
  component_network: number | null;
  scored_at: string | null;
  cached: boolean;
}

export interface CreatorListItem {
  _id: string;
  name: string;
  niche: string;
  country: string;
  pricePerPost: number;
  authenticityScore: number | null;
  riskLevel: 'Authentic' | 'Suspicious' | 'Inauthentic' | null;
  isVerified: boolean;
  platforms?: CreatorProfile['platforms'];
}

export async function registerCreator(
  token: string,
  payload: {
    name: string; niche: string; country: string;
    pricePerPost: number; socialStats: SocialStats;
    platforms?: CreatorProfile['platforms'];
  },
): Promise<CreatorProfile> {
  const res = await axios.post(`${BASE_URL}/creators`, payload, { headers: auth(token) });
  return res.data.data;
}

export async function getCreatorById(creatorId: string): Promise<CreatorProfile> {
  const res = await axios.get(`${BASE_URL}/creators/${creatorId}`);
  return res.data.data;
}

export async function updateCreator(
  token: string,
  payload: Partial<{
    name: string; niche: string; country: string;
    pricePerPost: number; socialStats: SocialStats;
  }>,
): Promise<CreatorProfile> {
  const res = await axios.put(`${BASE_URL}/creators`, payload, { headers: auth(token) });
  return res.data.data;
}

// Score endpoint returns fields at root level (not nested under .data)
export async function getCreatorScore(creatorId: string, refresh = false): Promise<ScoreResult> {
  const res = await axios.get(
    `${BASE_URL}/creators/${creatorId}/score${refresh ? '?refresh=true' : ''}`,
  );
  return res.data as ScoreResult;
}

export async function listCreators(params?: {
  page?: number; limit?: number; niche?: string; country?: string;
  minPrice?: number; maxPrice?: number; minScore?: number;
}): Promise<{ data: CreatorListItem[]; total: number; pages: number; page: number }> {
  const res = await axios.get(`${BASE_URL}/creators`, { params });
  return { data: res.data.data, total: res.data.total, pages: res.data.pages, page: res.data.page };
}
