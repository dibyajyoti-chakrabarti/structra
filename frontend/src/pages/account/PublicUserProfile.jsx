import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building, Calendar, MapPin, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AuthenticatedNavbar from "../../components/AuthenticatedNavbar";
import api from "../../api";
import LoadingState from "../../components/LoadingState";

const formatJoinedDate = (isoString) => {
  if (!isoString) return "Unknown";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

export default function PublicUserProfile() {
  const navigate = useNavigate();
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`users/${encodeURIComponent(username)}/profile/`);
        if (!isMounted) return;
        setProfile(response.data);
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.error || "Unable to load user profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [username]);

  const publicWorkspaces = useMemo(() => profile?.public_workspaces || [], [profile]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
        <div className="flex-none z-50">
          <AuthenticatedNavbar />
        </div>
        <LoadingState message="Loading user profile" minHeight="100vh" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
        <div className="flex-none z-50">
          <AuthenticatedNavbar />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error || "User profile not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
      <div className="flex-none z-50">
        <AuthenticatedNavbar />
      </div>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-8 md:p-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <section className="grid gap-6 md:grid-cols-[300px_1fr]">
            <aside className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                  <User size={24} className="text-gray-500" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{profile.full_name}</h1>
                  <p className="text-sm font-medium text-blue-700">@{profile.username}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building size={15} className="text-gray-400" />
                  <span>{profile.org_name || "Organization not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-gray-400" />
                  <span>{profile.org_loc || "Location not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-gray-400" />
                  <span>Joined {formatJoinedDate(profile.joined_at)}</span>
                </div>
              </div>

              <div className="mt-6 grid">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Workspaces</p>
                  <p className="text-lg font-semibold text-gray-900">{profile.workspace_count || 0}</p>
                </div>
              </div>
            </aside>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">Public Workspaces</h2>
              <p className="mt-1 text-sm text-gray-500">
                Only workspaces with public visibility are shown.
              </p>

              <div className="mt-5 space-y-3">
                {publicWorkspaces.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                    No public workspaces available.
                  </div>
                ) : (
                  publicWorkspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => navigate(`/app/ws/${workspace.id}`)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{workspace.name}</p>
                        <span className="text-xs text-gray-500">
                          {workspace.member_count || 0} members
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {workspace.description || "No description provided."}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Updated{" "}
                        {workspace.updated_at
                          ? formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })
                          : "recently"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
