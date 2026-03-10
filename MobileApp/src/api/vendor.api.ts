import axios from 'axios';
import { BASE_URL } from './config';
import { CreatorListItem, CreatorProfile } from './creator.api';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface VendorProfile {
  _id: string;
  uid: string;
  email: string;
  businessName: string;
  industry: string;
  country: string;
  isActive: boolean;
  createdAt: string;
}

export async function registerVendor(
  token: string,
  payload: { businessName: string; country: string; industry: string },
): Promise<VendorProfile> {
  const res = await axios.post(`${BASE_URL}/users/register`, payload, { headers: auth(token) });
  return res.data.data;
}

export async function searchCreators(
  token: string,
  params?: {
    keyword?: string; niche?: string; country?: string;
    minPrice?: number; maxPrice?: number; minScore?: number;
    page?: number; limit?: number;
  },
): Promise<{ data: CreatorListItem[]; total: number; pages: number; page: number }> {
  const res = await axios.get(`${BASE_URL}/vendors/creators`, {
    headers: auth(token),
    params,
  });
  return { data: res.data.data, total: res.data.total, pages: res.data.pages, page: res.data.page };
}

export async function getCreatorProfileAsVendor(
  token: string,
  creatorId: string,
): Promise<CreatorProfile> {
  const res = await axios.get(`${BASE_URL}/vendors/creators/${creatorId}`, {
    headers: auth(token),
  });
  return res.data.data;
}

export async function saveCreator(token: string, creatorId: string): Promise<void> {
  await axios.post(`${BASE_URL}/vendors/creators/save`, { creatorId }, { headers: auth(token) });
}
