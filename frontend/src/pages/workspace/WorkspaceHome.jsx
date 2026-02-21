import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, Users, Clock, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import api from '../../api'; // Import your axios instance

const WorkspaceHome = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]); // State for backend data
  const [starredWorkspaces, setStarredWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starringWorkspaceIds, setStarringWorkspaceIds] = useState([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const [workspaceResponse, starredResponse] = await Promise.all([
          api.get('workspaces/'),
          api.get('workspaces/starred/'),
        ]);
        setWorkspaces(workspaceResponse.data);
        setStarredWorkspaces(starredResponse.data);
      } catch (error) {
        console.error("Failed to fetch workspaces", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const toggleWorkspaceStar = async (workspaceId, nextState) => {
    if (!workspaceId) return;
    if (starringWorkspaceIds.includes(workspaceId)) return;

    const workspaceFromState = workspaces.find((workspace) => workspace.id === workspaceId)
      || starredWorkspaces.find((workspace) => workspace.id === workspaceId);
    const previousState = !!workspaceFromState?.is_starred;
    setStarringWorkspaceIds((prev) => [...prev, workspaceId]);
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, is_starred: nextState }
          : workspace
      )
    );
    if (workspaceFromState) {
      if (nextState) {
        setStarredWorkspaces((prev) => {
          if (prev.some((workspace) => workspace.id === workspaceId)) {
            return prev.map((workspace) =>
              workspace.id === workspaceId
                ? { ...workspace, is_starred: true }
                : workspace
            );
          }
          return [{ ...workspaceFromState, is_starred: true }, ...prev];
        });
      } else {
        setStarredWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
      }
    }

    try {
      const response = await api.patch(`workspaces/${workspaceId}/star/`, { is_starred: nextState });
      const confirmedState = typeof response?.data?.is_starred === 'boolean'
        ? response.data.is_starred
        : nextState;

      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, is_starred: confirmedState }
            : workspace
        )
      );
      if (!confirmedState) {
        setStarredWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
      }
    } catch (error) {
      console.error('Failed to update starred state', error);
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, is_starred: previousState }
            : workspace
        )
      );
      if (workspaceFromState) {
        if (previousState) {
          setStarredWorkspaces((prev) => {
            if (prev.some((workspace) => workspace.id === workspaceId)) {
              return prev;
            }
            return [{ ...workspaceFromState, is_starred: true }, ...prev];
          });
        } else {
          setStarredWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
        }
      }
    } finally {
      setStarringWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));
    }
  };

  const sortedWorkspaces = [...workspaces].sort((left, right) => {
    if (left.is_starred !== right.is_starred) {
      return Number(right.is_starred) - Number(left.is_starred);
    }
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
  const sortedStarredWorkspaces = [...starredWorkspaces].sort((left, right) =>
    new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-pulse text-gray-400 font-semibold">Loading Workspaces...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthenticatedNavbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Starred Workspaces</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
              {sortedStarredWorkspaces.length} starred
            </span>
          </div>

          {sortedStarredWorkspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-sm text-gray-500">
              No starred workspaces yet. Star any workspace from your list or public discover page to save it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {sortedStarredWorkspaces.map((ws) => (
                <div
                  key={`starred-${ws.id}`}
                  onClick={() => navigate(`/app/ws/${ws.id}`)}
                  className="bg-white p-6 rounded-xl border border-amber-200 hover:border-amber-300 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-md">
                      <Star size={24} className="fill-amber-300" />
                    </div>
                    <button
                      type="button"
                      aria-label="Unstar workspace"
                      title="Unstar workspace"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWorkspaceStar(ws.id, false);
                      }}
                      disabled={starringWorkspaceIds.includes(ws.id)}
                      className="p-1.5 rounded-md border border-amber-200 text-amber-500 hover:text-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      <Star size={16} className="fill-amber-400 text-amber-500" />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{ws.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Users size={16} className="text-gray-400" />
                      <span>{ws.member_count} {ws.member_count === 1 ? 'member' : 'members'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={16} className="text-gray-400" />
                      <span>{formatDistanceToNow(new Date(ws.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Workspaces</h1>
            <p className="text-gray-500 mt-1">Manage your projects and team environments.</p>
          </div>
          <button
            onClick={() => navigate('/app/create-workspace')}
            className="w-full md:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedWorkspaces.map((ws) => (
            <div 
              key={ws.id}
              onClick={() => navigate(`/app/ws/${ws.id}`)} 
              className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Layout size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={ws.is_starred ? 'Unstar workspace' : 'Star workspace'}
                    title={ws.is_starred ? 'Unstar workspace' : 'Star workspace'}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWorkspaceStar(ws.id, !ws.is_starred);
                    }}
                    disabled={starringWorkspaceIds.includes(ws.id)}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <Star
                      size={16}
                      className={ws.is_starred ? 'fill-amber-400 text-amber-500' : ''}
                    />
                  </button>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-wider border border-gray-200">
                    {ws.visibility}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{ws.name}</h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-gray-400" />
                  {/* Current model doesn't have a members count field yet */}
                  <span>{ws.member_count} {ws.member_count === 1 ? 'member' : 'members'}</span> 
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" />
                  <span>{formatDistanceToNow(new Date(ws.updated_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          ))}

          <button 
             onClick={() => navigate('/app/create-workspace')}
             className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors group min-h-[200px]"
          >
             <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-3">
                <Plus size={24} />
             </div>
             <span className="font-semibold text-gray-500 group-hover:text-blue-700">Create new workspace</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceHome;
