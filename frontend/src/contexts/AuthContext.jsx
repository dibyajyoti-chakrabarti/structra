import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api";

const USER_PLAN_STORAGE_KEY = "structra-user-plan";

const AuthContext = createContext({
  user: null,
  setUser: () => {},
  updateUserPlan: () => {},
  refreshUserProfile: async () => {},
});

const getStoredPlan = () => {
  if (typeof window === "undefined") return "CORE";
  if (!localStorage.getItem("access")) return "CORE";
  const storedPlan = localStorage.getItem(USER_PLAN_STORAGE_KEY);
  return storedPlan ? storedPlan.toUpperCase() : "CORE";
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => ({
    current_plan: getStoredPlan(),
    plan_expires_at: null,
  }));

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
    if (!localStorage.getItem("access")) {
      return;
    }

    try {
      const response = await api.get("auth/profile/", { cache: false });
      const profile = response.data || {};
      const profilePlan = (profile.current_plan || getStoredPlan()).toUpperCase();
      updateUserPlan(profilePlan, profile.plan_expires_at || null);
      setUser((prev) => ({
        ...(prev || {}),
        ...profile,
        current_plan: profilePlan,
      }));
    } catch (_error) {
      // Keep existing local plan fallback when profile fetch fails.
    }
  }, [updateUserPlan]);

  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      updateUserPlan,
      refreshUserProfile,
    }),
    [user, updateUserPlan, refreshUserProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
