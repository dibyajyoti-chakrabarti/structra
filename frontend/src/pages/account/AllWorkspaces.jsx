import { useNavigate } from 'react-router-dom';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

export default function AllWorkspaces() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AuthenticatedNavbar />

      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Workspace Shortcuts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quick navigation for signed-in workspace flows.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/app/profile')}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              View Profile
            </button>
            <button
              onClick={() => navigate('/app/notifications')}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Notifications
            </button>
            <button
              onClick={() => navigate('/app/create-workspace')}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Workspace
            </button>
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Open Workspace Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
