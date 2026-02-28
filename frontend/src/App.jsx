import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"; // 1. Import Navigate
import PrivateRoute from "./components/PrivateRoute";
import { useTheme } from "./contexts/ThemeContext.jsx";

// Page Imports
import Lander from "./pages/public/Lander";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import WorkspaceHome from "./pages/workspace/WorkspaceHome";
import DiscoverWorkspaces from "./pages/workspace/DiscoverWorkspaces";
import WorkspaceInstance, {
  WorkspaceOverview,
} from "./pages/workspace/WorkspaceInstance";
import CreateSystem from "./pages/workspace/CreateSystem";
import Profile from "./pages/account/Profile";
import PublicUserProfile from "./pages/account/PublicUserProfile";
import Notification from "./pages/account/Notification";
import CreateWorkspace from "./pages/workspace/CreateWorkspace";
import WorkspaceSettings from "./pages/workspace/settings/WorkspaceSettings";
import GeneralSettings from "./pages/workspace/settings/GeneralSettings";
import TeamSettings from "./pages/workspace/settings/TeamSettings";
import SecuritySettings from "./pages/workspace/settings/SecuritySettings";
import IamSettings from "./pages/workspace/settings/IamSettings";
import WorkspaceVisibility from "./pages/workspace/settings/WorkspaceVisibility";
import LogSettings from "./pages/workspace/settings/LogSettings";
import Canvas from "./pages/system/Canvas";
import Evaluation from "./pages/system/Evaluation";
import PresentCanvas from "./pages/system/PresentCanvas";
import InvitationRedirect from "./pages/invitations/InvitationRedirect";
import InvitationAcceptReject from "./pages/invitations/InvitationAcceptReject";
import Unauthorized from "./pages/infrastructure/Unauthorized";
import NotFound from "./pages/infrastructure/NotFound";
import ServerDown from "./pages/infrastructure/ServerDown";
import Pricing from "./pages/public/Pricing";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import OnboardingQuestionnaire from "./pages/onboarding/OnboardingQuestionnaire";
import GitHubCallback from "./pages/auth/GitHubCallback";
import LoadingState from "./components/LoadingState";
import PlanExpirationBanner from "./components/PlanExpirationBanner";

// 2. Create a helper component to handle the redirection
const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("access");

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

const ThemeRouteSync = () => {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    const isAppRoute = location.pathname.startsWith("/app");
    const nextTheme = isAppRoute ? theme : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, [location.pathname, theme]);

  return null;
};

function App() {
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [healthReady, setHealthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkBackendHealth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api/";
        const healthUrl = `${baseUrl.replace(/\/?$/, "/")}health/`;
        const response = await fetch(healthUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!isMounted) return;
        setBackendHealthy(response.ok);
      } catch (_error) {
        if (!isMounted) return;
        setBackendHealthy(false);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setHealthReady(true);
        }
      }
    };

    checkBackendHealth();
    const intervalId = setInterval(checkBackendHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  if (!healthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 via-white to-white px-4">
        <LoadingState
          message="Checking backend server status..."
          minHeight={280}
          imageWidth={176}
          className="w-full max-w-md rounded-2xl border border-blue-100 bg-white px-6 py-6 shadow-md shadow-blue-100/70"
        />
      </div>
    );
  }

  if (healthReady && !backendHealthy) {
    return <ServerDown />;
  }

  return (
    <BrowserRouter>
      <ThemeRouteSync />
      <PlanExpirationBanner />
      <Routes>
        <Route path="/auth/github/callback" element={<GitHubCallback />} />
        
        {/* PUBLIC ROUTES - Wrapped to redirect authenticated users */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Lander />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* PROTECTED ROUTES */}
        <Route element={<PrivateRoute />}>
          <Route path="/app/onboarding" element={<OnboardingQuestionnaire />} />
          <Route path="/app" element={<WorkspaceHome />} />
          <Route path="/app/discover" element={<DiscoverWorkspaces />} />
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/users/:username" element={<PublicUserProfile />} />
          <Route path="/app/notifications" element={<Notification />} />
          <Route path="/app/create-workspace" element={<CreateWorkspace />} />
          <Route path="/app/home" element={<WorkspaceHome />} />

          {/* NESTED WORKSPACE ROUTES */}
          <Route path="/app/ws/:workspaceId" element={<WorkspaceInstance />}>
            <Route index element={<WorkspaceOverview />} />
            <Route path="create-system" element={<CreateSystem />} />

            <Route path="settings" element={<WorkspaceSettings />}>
              <Route index element={<GeneralSettings />} />
              <Route path="team" element={<TeamSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="logs" element={<LogSettings />} />
            </Route>
          </Route>

          {/* System/Canvas Routes */}
          <Route
            path="/app/ws/:workspaceId/systems/:systemId"
            element={<Canvas />}
          />
          <Route
            path="/app/ws/:workspaceId/systems/:systemId/evaluate"
            element={<Evaluation />}
          />
          <Route
            path="/app/ws/:workspaceId/systems/:systemId/present"
            element={<PresentCanvas />}
          />
        </Route>

        {/* Invitation Routes */}
        <Route path="/invite/:token" element={<InvitationRedirect />} />
        <Route
          path="/invite/:token/respond"
          element={<InvitationAcceptReject />}
        />

        {/* Error Routes */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
