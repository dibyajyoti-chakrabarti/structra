// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lander from './pages/public/Lander';
import Pricing from './pages/public/Pricing';
import Faqs from './pages/public/Faqs';
import Support from './pages/public/Support';
import Terms from './pages/public/Terms';
import Privacy from './pages/public/Privacy';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import AllWorkspaces from './pages/account/AllWorkspaces';
import Profile from './pages/account/Profile';
import Notification from './pages/account/Notification';
import CreateWorkspace from './pages/workspace/CreateWorkspace';
import WorkspaceHome from './pages/workspace/WorkspaceHome';
import CreateSystem from './pages/workspace/CreateSystem';
import WorkspaceSettings from './pages/workspace/settings/WorkspaceSettings';
import GeneralSettings from './pages/workspace/settings/GeneralSettings';
import TeamSettings from './pages/workspace/settings/TeamSettings';
import SecuritySettings from './pages/workspace/settings/SecuritySettings';
import IamSettings from './pages/workspace/settings/IamSettings';
import WorkspaceVisibility from './pages/workspace/settings/WorkspaceVisibility';
import LogSettings from './pages/workspace/settings/LogSettings';
import Canvas from './pages/system/Canvas';
import Evaluation from './pages/system/Evaluation';
import PresentCanvas from './pages/system/PresentCanvas';
import InvitationRedirect from './pages/invitations/InvitationRedirect';
import InvitationAcceptReject from './pages/invitations/InvitationAcceptReject';
import Documentation from './pages/documentation/Documentation';
import NotFound from './pages/infrastructure/NotFound';
import Unauthorized from './pages/infrastructure/Unauthorized';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Lander />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/support" element={<Support />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Documentation */}
        <Route path="/docs" element={<Documentation />} />
        
        {/* Authenticated App Routes */}
        <Route path="/app" element={<AllWorkspaces />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="/app/notifications" element={<Notification />} />
        <Route path="/app/create-workspace" element={<CreateWorkspace />} />
        
        {/* Workspace Routes */}
        <Route path="/app/ws/:workspaceId" element={<WorkspaceHome />} />
        <Route path="/app/ws/:workspaceId/create-system" element={<CreateSystem />} />
        
        {/* Workspace Settings Routes */}
        <Route path="/app/ws/:workspaceId/settings" element={<WorkspaceSettings />}>
          <Route path="general" element={<GeneralSettings />} />
          <Route path="team" element={<TeamSettings />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="iam" element={<IamSettings />} />
          <Route path="visibility" element={<WorkspaceVisibility />} />
          <Route path="logs" element={<LogSettings />} />
        </Route>
        
        {/* System Routes */}
        <Route path="/app/ws/:workspaceId/system/:systemId" element={<Canvas />} />
        <Route path="/app/ws/:workspaceId/system/:systemId/evaluate" element={<Evaluation />} />
        <Route path="/app/ws/:workspaceId/system/:systemId/present" element={<PresentCanvas />} />
        
        {/* Invitation Routes */}
        <Route path="/invite/:token" element={<InvitationRedirect />} />
        <Route path="/invite/:token/respond" element={<InvitationAcceptReject />} />
        
        {/* Error Routes */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;