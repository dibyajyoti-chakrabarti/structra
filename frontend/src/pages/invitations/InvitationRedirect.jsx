import { useNavigate, useParams } from 'react-router-dom';

export default function InvitationRedirect() {
  const navigate = useNavigate();
  const { token } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from InvitationRedirect.jsx</h1>
      <p className="text-gray-600">Token: {token}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate(`/invite/${token}/respond`)} className="px-4 py-2 bg-blue-500 text-white rounded">Process Invitation</button>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-500 text-white rounded">Go Home</button>
      </div>
    </div>
  );
}