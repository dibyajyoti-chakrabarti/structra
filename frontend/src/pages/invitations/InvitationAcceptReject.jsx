import { useNavigate, useParams } from 'react-router-dom';

export default function InvitationAcceptReject() {
  const navigate = useNavigate();
  const { token } = useParams();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Hello from InvitationAcceptReject.jsx</h1>
      <p className="text-gray-600">Token: {token}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate('/app')} className="px-4 py-2 bg-green-500 text-white rounded">Accept Invitation</button>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-red-500 text-white rounded">Reject Invitation</button>
      </div>
    </div>
  );
}