import { useNavigate, useParams } from 'react-router-dom';

export default function CanvasHorizontalNavbar() {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  
  return (
    <nav className="bg-white border-b border-gray-200 p-3">
      <div className="container mx-auto flex justify-between items-center">
        <span className="font-semibold text-gray-800">System: {systemId}</span>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}/systems/${systemId}/evaluate`)}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Evaluate
          </button>
          <button
            onClick={() => navigate(`/app/ws/${workspaceId}/systems/${systemId}/present`)}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Present
          </button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            Export
          </button>
        </div>
      </div>
    </nav>
  );
}
