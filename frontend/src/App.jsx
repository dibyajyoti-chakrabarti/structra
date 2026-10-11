import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import { useTheme } from "./contexts/ThemeContext.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";

// Page Imports
import Lander from "./pages/public/Lander";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AuthCallback from "./pages/auth/AuthCallback";
import WorkspaceHome from "./pages/workspace/WorkspaceHome";
import DiscoverWorkspaces from "./pages/workspace/DiscoverWorkspaces";
import WorkspaceInstance, {
  WorkspaceOverview,
} from "./pages/workspace/WorkspaceInstance";
import WorkspaceEvaluations from "./pages/workspace/WorkspaceEvaluations";
import CreateSystem from "./pages/workspace/CreateSystem";
import Profile from "./pages/account/Profile";
import PublicUserProfile from "./pages/account/PublicUserProfile";
import Notification from "./pages/account/Notification";
import CreateWorkspace from "./pages/workspace/CreateWorkspace";
import WorkspaceSettings from "./pages/workspace/settings/WorkspaceSettings";
import GeneralSettings from "./pages/workspace/settings/GeneralSettings";
import TeamSettings from "./pages/workspace/settings/TeamSettings";
import SecuritySettings from "./pages/workspace/settings/SecuritySettings";
import LogSettings from "./pages/workspace/settings/LogSettings";
import Canvas from "./pages/system/Canvas";
import Evaluation from "./pages/system/Evaluation";
import PresentCanvas from "./pages/system/PresentCanvas";
import InvitationRedirect from "./pages/invitations/InvitationRedirect";
import InvitationAcceptReject from "./pages/invitations/InvitationAcceptReject";
import InvitationInbox from "./pages/invitations/InvitationInbox";
import Unauthorized from "./pages/infrastructure/Unauthorized";
import NotFound from "./pages/infrastructure/NotFound";
import BackendGate from "./components/BackendGate";
import Pricing from "./pages/public/Pricing";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import OnboardingQuestionnaire from "./pages/onboarding/OnboardingQuestionnaire";
import PlanExpirationBanner from "./components/PlanExpirationBanner";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
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
  return (
    <BrowserRouter>
      <ThemeRouteSync />
      <BackendGate>
      <PlanExpirationBanner />
      <Routes>
        {/* Google and GitHub sign in lands here, outside PublicRoute so it can finish signing in */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* PUBLIC ROUTES */}
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
          <Route path="/app/invitations" element={<InvitationInbox />} />
          <Route path="/app/create-workspace" element={<CreateWorkspace />} />
          <Route path="/app/home" element={<WorkspaceHome />} />

          <Route path="/app/ws/:workspaceId" element={<WorkspaceInstance />}>
            <Route index element={<WorkspaceOverview />} />
            <Route path="create-system" element={<CreateSystem />} />
            <Route path="evaluations" element={<WorkspaceEvaluations />} />

            <Route path="settings" element={<WorkspaceSettings />}>
              <Route index element={<GeneralSettings />} />
              <Route path="team" element={<TeamSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="logs" element={<LogSettings />} />
            </Route>
          </Route>

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
      </BackendGate>
    </BrowserRouter>
  );
}

export default App;
