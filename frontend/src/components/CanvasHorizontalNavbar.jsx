import { useNavigate, useParams } from 'react-router-dom';

export default function CanvasHorizontalNavbar() {
  const navigate = useNavigate();
  const { workspaceId, systemId } = useParams();
  
  return (
    <nav className="bg-gray-600 text-white p-3">
      <div className="container mx-auto flex justify-between items-center">
        <span className="font-bold">System: {systemId}</span>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/app/ws/${workspaceId}/system/${systemId}/evaluate`)} className="px-3 py-1 bg-green-500 rounded hover:bg-green-600">Evaluate</button>
          <button onClick={() => navigate(`/app/ws/${workspaceId}/system/${systemId}/present`)} className="px-3 py-1 bg-purple-500 rounded hover:bg-purple-600">Present</button>
          <button className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600">Export</button>
        </div>
      </div>
    </nav>
  );
}
