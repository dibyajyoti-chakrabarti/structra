import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';

// Page Imports
import Lander from './pages/public/Lander';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import WorkspaceHome from './pages/workspace/WorkspaceHome';
import WorkspaceInstance, { WorkspaceOverview } from './pages/workspace/WorkspaceInstance'; 
import CreateSystem from './pages/workspace/CreateSystem';
import Profile from './pages/account/Profile';
import Notification from './pages/account/Notification';
import CreateWorkspace from './pages/workspace/CreateWorkspace';
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
import Unauthorized from './pages/infrastructure/Unauthorized';
import NotFound from './pages/infrastructure/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Lander />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* PROTECTED ROUTES */}
        <Route element={<PrivateRoute />}>
            <Route path="/app" element={<WorkspaceHome />} />
            <Route path="/app/profile" element={<Profile />} />
            <Route path="/app/notifications" element={<Notification />} />
            <Route path="/app/create-workspace" element={<CreateWorkspace />} />
            <Route path="/app/home" element={<WorkspaceHome />} />
            
            {/* NESTED WORKSPACE ROUTES 
               WorkspaceInstance provides the Navbars and the <Outlet />
            */}
            <Route path="/app/ws/:workspaceId" element={<WorkspaceInstance />}>
                <Route index element={<WorkspaceOverview />} />
                <Route path="create-system" element={<CreateSystem />} />

                <Route path="settings" element={<WorkspaceSettings />}>
                  <Route index element={<GeneralSettings />} /> {/* Default to general */}
                  <Route path="team" element={<TeamSettings />} />
                  <Route path="security" element={<SecuritySettings />} />
                  <Route path="logs" element={<LogSettings />} />
                </Route>
            </Route>
            
            {/* Workspace Settings */}
            <Route path="/app/ws/:workspaceId/settings" element={<WorkspaceSettings />}>
              <Route path="general" element={<GeneralSettings />} />
              <Route path="team" element={<TeamSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="iam" element={<IamSettings />} />
              <Route path="visibility" element={<WorkspaceVisibility />} />
              <Route path="logs" element={<LogSettings />} />
            </Route>
            
            {/* System/Canvas Routes */}
            <Route path="/app/ws/:workspaceId/system/:systemId" element={<Canvas />} />
            <Route path="/app/ws/:workspaceId/system/:systemId/evaluate" element={<Evaluation />} />
            <Route path="/app/ws/:workspaceId/system/:systemId/present" element={<PresentCanvas />} />
        </Route>
        
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