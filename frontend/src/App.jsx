import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // 1. Import Navigate
import PrivateRoute from "./components/PrivateRoute";

// Page Imports
import Lander from "./pages/public/Lander";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import WorkspaceHome from "./pages/workspace/WorkspaceHome";
import WorkspaceInstance, {
  WorkspaceOverview,
} from "./pages/workspace/WorkspaceInstance";
import CreateSystem from "./pages/workspace/CreateSystem";
import Profile from "./pages/account/Profile";
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
import Pricing from "./pages/public/Pricing";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import OnboardingQuestionnaire from "./pages/onboarding/OnboardingQuestionnaire";
import GitHubCallback from "./pages/auth/GitHubCallback";

// 2. Create a helper component to handle the redirection
const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("token"); // Ensure this key matches your auth logic

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/app/profile" element={<Profile />} />
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