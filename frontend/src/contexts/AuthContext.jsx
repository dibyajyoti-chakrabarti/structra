import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { clearApiCache } from "../api";
import { logout } from "../auth/authClient";
import { BACKEND_READY } from "../auth/events";
import { clearTokens, getTokens, setTokens, subscribe } from "../auth/tokenStore";

const USER_PLAN_STORAGE_KEY = "structra-user-plan";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  authChecked: false,
  setUser: () => {},
  signIn: () => {},
  updateUserPlan: () => {},
  refreshUserProfile: async () => {},
  signOut: async () => {},
});

const getStoredPlan = () => {
  if (typeof window === "undefined") return "CORE";
  const storedPlan = localStorage.getItem(USER_PLAN_STORAGE_KEY);
  return storedPlan ? storedPlan.toUpperCase() : "CORE";
};

// Resolves when the backend gate reports the server is up, or after a fallback delay.
const waitForBackend = () =>
  new Promise((resolve) => {
    const done = () => {
      window.removeEventListener(BACKEND_READY, done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 15000);
    window.addEventListener(BACKEND_READY, done);
  });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Optimistic: holding tokens means we have a session. This keeps a signed in user from
  // being sent to the landing page while a sleeping server wakes up. The profile check
  // below corrects it if the session turns out to be dead.
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getTokens());
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

  const applyProfile = useCallback((profile) => {
    const profilePlan = (profile.current_plan || getStoredPlan()).toUpperCase();
    localStorage.setItem(USER_PLAN_STORAGE_KEY, profilePlan);
    setUser((prev) => ({
      ...(prev || {}),
      ...profile,
      current_plan: profilePlan,
    }));
    setIsAuthenticated(true);
  }, []);

  // Returns "ok", "signed_out" or "unreachable" (a sleeping server, not a dead session).
  const refreshUserProfile = useCallback(async () => {
    if (!getTokens()) {
      setIsAuthenticated(false);
      setUser(null);
      return "signed_out";
    }
    try {
      const response = await api.get("auth/profile/", { cache: false });
      applyProfile(response.data || {});
      return "ok";
    } catch (error) {
      if (error.response?.status === 401 || !getTokens()) {
        setIsAuthenticated(false);
        setUser(null);
        return "signed_out";
      }
      // Keep existing user state on transient network errors
      return "unreachable";
    }
  }, [applyProfile]);

  // Called by the login pages with the token response from the API.
  const signIn = useCallback(
    (payload) => {
      clearApiCache();
      setTokens(payload);
      if (payload.user) applyProfile(payload.user);
      else setIsAuthenticated(true);
      return payload.user;
    },
    [applyProfile],
  );

  const signOut = useCallback(async () => {
    await logout();
    clearTokens();
    clearApiCache();
    localStorage.removeItem(USER_PLAN_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!getTokens()) {
        setAuthChecked(true);
        return;
      }
      let result = await refreshUserProfile();
      while (result === "unreachable" && !cancelled) {
        await waitForBackend();
        result = await refreshUserProfile();
      }
      if (!cancelled) setAuthChecked(true);
    };
    init();

    // Signed out here (session ended) or in another tab.
    const unsubscribe = subscribe((tokens) => {
      if (!tokens) {
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshUserProfile]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      authChecked,
      setUser,
      signIn,
      updateUserPlan,
      refreshUserProfile,
      signOut,
    }),
    [user, isAuthenticated, authChecked, signIn, updateUserPlan, refreshUserProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
