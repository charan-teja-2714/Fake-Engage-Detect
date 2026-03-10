import axios from 'axios';
import { BASE_URL } from './config';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface PromotionRequest {
  _id: string;
  vendor: { _id: string; businessName: string; industry: string } | string;
  creator: { _id: string; name: string; niche: string; country: string; pricePerPost: number } | string;
  campaignTitle: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedBudget: number;
  contactEmail: string;
  createdAt: string;
}

// Vendor: send proposal to a creator
export async function sendProposal(
  token: string,
  payload: {
    creatorId: string;
    campaignTitle: string;
    message: string;
    proposedBudget: number;
  },
): Promise<PromotionRequest> {
  const res = await axios.post(`${BASE_URL}/promotions`, payload, { headers: auth(token) });
  return res.data.data;
}

// Creator: get all received proposals
export async function getCreatorProposals(token: string): Promise<PromotionRequest[]> {
  const res = await axios.get(`${BASE_URL}/promotions/creator`, { headers: auth(token) });
  return res.data.data;
}

// Creator: accept or reject a proposal
export async function updateProposalStatus(
  token: string,
  requestId: string,
  status: 'accepted' | 'rejected',
): Promise<PromotionRequest> {
  const res = await axios.put(
    `${BASE_URL}/promotions/status`,
    { requestId, status },
    { headers: auth(token) },
  );
  return res.data.data;
}

// Vendor: get all sent proposals
export async function getVendorProposals(token: string): Promise<PromotionRequest[]> {
  const res = await axios.get(`${BASE_URL}/promotions/vendor`, { headers: auth(token) });
  return res.data.data;
}
