import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchAuthSession, getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import api from "../api";

const USER_PLAN_STORAGE_KEY = "structra-user-plan";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  setUser: () => {},
  updateUserPlan: () => {},
  refreshUserProfile: async () => {},
  signOut: async () => {},
});

const getStoredPlan = () => {
  if (typeof window === "undefined") return "CORE";
  const storedPlan = localStorage.getItem(USER_PLAN_STORAGE_KEY);
  return storedPlan ? storedPlan.toUpperCase() : "CORE";
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const updateUserPlan = useCallback((currentPlan, expiresAt = null) => {
    const normalizedPlan = (currentPlan || "CORE").toUpperCase();
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_PLAN_STORAGE_KEY, normalizedPlan);
    }
    setUser((prev) => ({
      ...(prev || {}),
      current_plan: normalizedPlan,
      plan_expires_at: expiresAt,
    }));
  }, []);

  const refreshUserProfile = useCallback(async () => {
    try {
      await getCurrentUser();
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    try {
      const response = await api.get("auth/profile/", { cache: false });
      const profile = response.data || {};
      const profilePlan = (profile.current_plan || getStoredPlan()).toUpperCase();
      localStorage.setItem(USER_PLAN_STORAGE_KEY, profilePlan);
      setUser((prev) => ({
        ...(prev || {}),
        ...profile,
        current_plan: profilePlan,
      }));
      setIsAuthenticated(true);
    } catch {
      // Keep existing user state on transient network errors
    }
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    localStorage.removeItem(USER_PLAN_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await fetchAuthSession();
        if (session?.tokens?.idToken) {
          await refreshUserProfile();
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    init();
  }, [refreshUserProfile]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      authChecked,
      setUser,
      updateUserPlan,
      refreshUserProfile,
      signOut,
    }),
    [user, isAuthenticated, authChecked, updateUserPlan, refreshUserProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
