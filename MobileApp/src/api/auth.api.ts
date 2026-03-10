import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, FIREBASE_SIGNUP_URL, FIREBASE_LOGIN_URL } from './config';

export interface StoredUser {
  uid: string;
  email: string;
  idToken: string;
  role: 'creator' | 'vendor' | null;   // currently active role
  profileId: string | null;            // MongoDB _id of the active profile
  profileCompleted: boolean;
  creatorProfileId: string | null;     // set once creator profile exists
  vendorProfileId: string | null;      // set once vendor profile exists
}

// ── Firebase REST auth (no native SDK needed) ─────────────────────────────────

export async function firebaseRegister(email: string, password: string) {
  const res = await axios.post(FIREBASE_SIGNUP_URL, { email, password, returnSecureToken: true });
  return { uid: res.data.localId as string, idToken: res.data.idToken as string };
}

export async function firebaseLogin(email: string, password: string) {
  const res = await axios.post(FIREBASE_LOGIN_URL, { email, password, returnSecureToken: true });
  return { uid: res.data.localId as string, idToken: res.data.idToken as string };
}

// ── Backend role + profileId fetch ────────────────────────────────────────────

export async function fetchMe(idToken: string): Promise<{
  role: 'creator' | 'vendor' | null;
  profileCompleted: boolean;
  profileId: string | null;
  creatorProfileId: string | null;
  vendorProfileId: string | null;
}> {
  const res = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const d = res.data.data;
  return {
    role:             d.role             ?? null,
    profileCompleted: d.profileCompleted ?? false,
    profileId:        d.profileId        ?? null,
    creatorProfileId: d.creatorProfileId ?? null,
    vendorProfileId:  d.vendorProfileId  ?? null,
  };
}

// ── AsyncStorage ──────────────────────────────────────────────────────────────

const KEY = '@auth';

export const saveUser  = (u: StoredUser) => AsyncStorage.setItem(KEY, JSON.stringify(u));
export const loadUser  = async (): Promise<StoredUser | null> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
};
export const clearUser = () => AsyncStorage.removeItem(KEY);
