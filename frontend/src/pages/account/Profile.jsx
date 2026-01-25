import { useNavigate } from 'react-router-dom';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

export default function Profile() {
  const navigate = useNavigate();

  // Hardcoded user + workspace data for now
  const user = {
    name: 'User Name',
    email: 'email@id.com',
    pronouns: 'he/him',
    bio: 'Profile Bio',
    org: 'Organization',
    role: 'Work Position',
  };

  const workspaces = [
    { id: 'ws-1', name: 'Workspace 1', visibility: 'public', members: 4 },
    { id: 'ws-2', name: 'Workspace 2', visibility: 'private', members: 11 },
    { id: 'ws-3', name: 'Workspace 3', visibility: 'public', members: 2 },
    { id: 'ws-4', name: 'Workspace 4', visibility: 'public', members: 13 },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-[#f5f5f5]">
      
      {/* Top Navbar */}
      <AuthenticatedNavbar />

      {/* Body */}
      <div className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Left: Profile Card */}
          <div className="md:col-span-1 border border-[#1f1f1f] rounded-lg bg-[#0f0f0f] p-6">
            <div className="w-32 h-32 rounded-full bg-[#111111] mb-6" />

            <h2 className="text-lg font-semibold">
              {user.name}
            </h2>

            <p className="text-sm text-[#a3a3a3] mt-1">
              {user.email} | {user.pronouns}
            </p>

            <p className="text-sm text-[#a3a3a3] mt-4">
              {user.bio}
            </p>

            <p className="text-xs text-[#6b6b6b] mt-4">
              {user.org} · {user.role}
            </p>

            <button
              className="w-full mt-6 px-4 py-2 border border-[#2a2a2a] rounded-md text-sm hover:bg-[#111111] transition"
            >
              Edit Profile
            </button>
          </div>

          {/* Right: All Workspaces (GitHub-style) */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">
                All Workspaces
              </h1>

              <button
                onClick={() => navigate('/app/create-workspace')}
                className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition text-sm"
              >
                New Workspace
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => navigate(`/app/ws/${ws.id}`)}
                  className="text-left border border-[#1f1f1f] rounded-lg bg-[#0f0f0f] p-6 hover:border-white transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">
                      {ws.name}
                    </h3>

                    <span className="text-xs px-2 py-1 border border-[#2a2a2a] rounded-md text-[#a3a3a3]">
                      {ws.visibility}
                    </span>
                  </div>

                  <p className="text-sm text-[#6b6b6b]">
                    {ws.members} members
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
