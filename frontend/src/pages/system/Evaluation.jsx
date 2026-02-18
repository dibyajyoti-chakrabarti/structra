import { useNavigate, useParams } from 'react-router-dom';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

export default function Evaluation() {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AuthenticatedNavbar />

      <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">System Evaluation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Evaluation UI is not yet configured for this system.
          </p>
          <div className="mt-6 space-y-1 text-sm text-gray-600">
            <p>Workspace ID: {workspaceId}</p>
            <p>System ID: {systemId}</p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => navigate(`/app/ws/${workspaceId}/systems/${systemId}`)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Back to Canvas
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
