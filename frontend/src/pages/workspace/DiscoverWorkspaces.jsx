import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Globe, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import api from '../../api';

const DiscoverWorkspaces = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryInput, setQueryInput] = useState(searchParams.get('q') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const activeRequestRef = useRef(0);

  const query = (searchParams.get('q') || '').trim();

  useEffect(() => {
    setQueryInput(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const requestId = ++activeRequestRef.current;
    setIsLoading(true);
    setErrorMessage('');

    const params = { limit: 50, offset: 0 };
    if (query) {
      params.q = query;
    }

    api
      .get('workspaces/public/search/', { params })
      .then((response) => {
        if (requestId !== activeRequestRef.current) return;
        setWorkspaces(response.data?.results || []);
        setTotalCount(response.data?.count || 0);
      })
      .catch(() => {
        if (requestId !== activeRequestRef.current) return;
        setErrorMessage('Failed to load public workspaces.');
        setWorkspaces([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (requestId !== activeRequestRef.current) return;
        setIsLoading(false);
      });
  }, [query]);

  const submitSearch = () => {
    const trimmed = queryInput.trim();
    if (!trimmed) {
      setSearchParams({});
      return;
    }
    setSearchParams({ q: trimmed });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitSearch();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthenticatedNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Discover Public Workspaces</h1>
            <p className="text-gray-500 text-sm mt-1">
              {query ? `Showing results for "${query}"` : 'Browse all public workspaces.'}
            </p>
          </div>
          <div className="w-full md:w-[420px] flex items-center rounded-xl border border-gray-200 px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5">
            <Search size={16} className="text-gray-400 mr-2" />
            <input
              type="text"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search public workspaces..."
              className="w-full bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
            />
            <button
              onClick={submitSearch}
              className="ml-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 p-10 text-center text-gray-500">Loading workspaces...</div>
        ) : errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{errorMessage}</div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            No public workspaces found.
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-4">{totalCount} result{totalCount === 1 ? '' : 's'}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => navigate(`/app/ws/${workspace.id}`)}
                  className="rounded-xl border border-gray-200 p-5 bg-white hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{workspace.name}</h3>
                      <p className="text-xs text-gray-500">By {workspace.owner_name || 'Unknown owner'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md">
                      <Globe size={12} />
                      Public
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 min-h-10">
                    {workspace.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock size={13} />
                      Updated {formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })}
                    </div>
                    <span className="text-xs text-gray-400">Workspace ID: {workspace.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DiscoverWorkspaces;
