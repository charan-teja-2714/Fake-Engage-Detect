import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  StoredUser,
  firebaseLogin,
  firebaseRegister,
  fetchMe,
  saveUser,
  loadUser,
  clearUser,
} from '../api/auth.api';

interface AuthCtx {
  user: StoredUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeProfile: (role: 'creator' | 'vendor', profileId: string) => Promise<void>;
  // Instant switch to a role that already has a profile
  switchRole: (targetRole: 'creator' | 'vendor') => Promise<void>;
  // Start registration for a new role (called from RoleChooserScreen)
  startRegistration: (role: 'creator' | 'vendor') => Promise<void>;
  // Return to RoleChooserScreen from anywhere (dashboard or registration)
  goToChooser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);
const BLANK = { creatorProfileId: null, vendorProfileId: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await loadUser();
        if (saved) {
          const hasProfiles = !!(saved.creatorProfileId || saved.vendorProfileId);
          if (hasProfiles) {
            // Always reset active role on app start → forces RoleChooserScreen
            const reset = { ...saved, role: null as null, profileId: null, profileCompleted: false };
            await saveUser(reset);
            setUser(reset);
          } else {
            setUser(saved);
          }
        }
      } catch {
        // ignore storage errors on boot
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { uid, idToken } = await firebaseLogin(email, password);
    let creatorProfileId: string | null = null;
    let vendorProfileId: string | null = null;
    try {
      const me = await fetchMe(idToken);
      creatorProfileId = me.creatorProfileId;
      vendorProfileId  = me.vendorProfileId;
    } catch {
      // backend unreachable
    }
    const u: StoredUser = {
      uid, email, idToken,
      role: null, profileId: null, profileCompleted: false,
      creatorProfileId, vendorProfileId,
    };
    await saveUser(u);
    setUser(u);
  };

  const register = async (email: string, password: string) => {
    const { uid, idToken } = await firebaseRegister(email, password);
    const u: StoredUser = {
      uid, email, idToken,
      role: null, profileId: null, profileCompleted: false,
      ...BLANK,
    };
    await saveUser(u);
    setUser(u);
  };

  const logout = async () => {
    await clearUser();
    setUser(null);
  };

  const completeProfile = async (role: 'creator' | 'vendor', profileId: string) => {
    if (!user) return;
    const updated: StoredUser = {
      ...user, role, profileId, profileCompleted: true,
      creatorProfileId: role === 'creator' ? profileId : (user.creatorProfileId ?? null),
      vendorProfileId:  role === 'vendor'  ? profileId : (user.vendorProfileId  ?? null),
    };
    await saveUser(updated);
    setUser(updated);
  };

  // Instant switch — only valid when the target profile already exists
  const switchRole = async (targetRole: 'creator' | 'vendor') => {
    if (!user) return;
    const existingId = targetRole === 'creator' ? user.creatorProfileId : user.vendorProfileId;
    if (!existingId) return; // shouldn't be called without an existing profile
    const updated: StoredUser = {
      ...user, role: targetRole, profileId: existingId, profileCompleted: true,
    };
    await saveUser(updated);
    setUser(updated);
  };

  // Go to registration form for a NEW role (called from RoleChooserScreen only)
  const startRegistration = async (role: 'creator' | 'vendor') => {
    if (!user) return;
    const updated: StoredUser = {
      ...user, role, profileId: null, profileCompleted: false,
    };
    await saveUser(updated);
    setUser(updated);
  };

  // Return to RoleChooserScreen from any dashboard or registration screen
  const goToChooser = async () => {
    if (!user) return;
    const updated: StoredUser = {
      ...user, role: null, profileId: null, profileCompleted: false,
    };
    await saveUser(updated);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout,
      completeProfile, switchRole, startRegistration, goToChooser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
