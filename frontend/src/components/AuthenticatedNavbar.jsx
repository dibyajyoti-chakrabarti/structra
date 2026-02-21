import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Bell, Zap, Search, Menu, X, LogOut } from 'lucide-react';
import { NotificationDrawer } from '../pages/account/Notification';
import api, { clearApiCache } from '../api';
// Import the logo from your assets folder
import logo from '../assets/logo.png'; 

export default function AuthenticatedNavbar() {
  const SEARCH_DROPDOWN_LIMIT = 8;
  const SEARCH_DEBOUNCE_MS = 300;

  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchContainerRef = useRef(null);
  const activeSearchRequestRef = useRef(0);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
    setIsSearchDropdownOpen(false);
  }, [location.pathname]);

  // Logout Logic
  const handleLogout = () => {
    // 1. Clear tokens
    clearApiCache();
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    // 2. Redirect to login
    navigate('/login');
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!isSearchDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current
        && !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchDropdownOpen]);

  useEffect(() => {
    if (!isSearchDropdownOpen) return;

    if (!debouncedSearchQuery) {
      setSearchResults([]);
      setSearchError('');
      setIsSearchLoading(false);
      return;
    }

    const requestId = ++activeSearchRequestRef.current;
    setIsSearchLoading(true);
    setSearchError('');

    api
      .get('workspaces/public/search/', {
        params: {
          q: debouncedSearchQuery,
          limit: SEARCH_DROPDOWN_LIMIT,
          offset: 0,
        },
      })
      .then((response) => {
        if (requestId !== activeSearchRequestRef.current) return;
        setSearchResults(response.data?.results || []);
      })
      .catch(() => {
        if (requestId !== activeSearchRequestRef.current) return;
        setSearchError('Search failed. Try again.');
        setSearchResults([]);
      })
      .finally(() => {
        if (requestId !== activeSearchRequestRef.current) return;
        setIsSearchLoading(false);
      });
  }, [debouncedSearchQuery, isSearchDropdownOpen]);

  const submitSearch = () => {
    const trimmedQuery = searchQuery.trim();
    setIsSearchDropdownOpen(false);
    setIsMobileMenuOpen(false);

    if (!trimmedQuery) {
      navigate('/app/discover');
      return;
    }

    navigate(`/app/discover?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitSearch();
  };

  return (
    <>
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between">
        
        {/* Left: Brand Emphasized with Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/app')}
        >
          <img 
            src={logo} 
            alt="structra logo" 
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
          />
          <span className="text-xl font-extrabold tracking-tighter text-gray-900 flex items-center">
            structra
            <span className="text-blue-600">.cloud</span>
            {/* Subtle Enterprise Tag */}
            <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase tracking-widest bg-gray-100 text-gray-500 rounded border border-gray-200 font-bold">
              Beta
            </span>
          </span>
        </div>

        {/* Middle: Utility Search (Desktop) */}
        <div className="hidden lg:block w-80 relative" ref={searchContainerRef}>
          <div className="flex items-center bg-gray-50 px-4 py-2 rounded-full border border-gray-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
            <Search size={16} className="text-gray-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search public workspaces..."
              className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
            />
            <button
              onClick={submitSearch}
              className="ml-2 p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Search"
            >
              <Search size={14} />
            </button>
          </div>

          {isSearchDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl z-[90] overflow-hidden">
              {!debouncedSearchQuery ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Type to search public workspaces.
                </div>
              ) : isSearchLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
              ) : searchError ? (
                <div className="px-4 py-3 text-sm text-red-600">{searchError}</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No public workspaces found.</div>
              ) : (
                <>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((workspace) => (
                      <div
                        key={workspace.id}
                        className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-semibold text-gray-900 truncate">{workspace.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {workspace.description || 'No description'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={submitSearch}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    View all results
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/docs')} className="hover:text-black transition-colors">
              Docs
            </button>
            <button onClick={() => navigate('/pricing')} className="flex items-center gap-1.5 hover:text-black transition-colors">
              <Zap size={14} className="fill-current" />
              Upgrade
            </button>
          </nav>

          <div className="h-6 w-[1px] bg-gray-200"></div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              className={`p-2 rounded-lg transition-all border ${
                isNotificationOpen
                  ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                  : 'bg-white text-gray-500 border-transparent hover:text-black hover:bg-gray-100'
              }`}
              title="Notifications"
            >
              <Bell size={20} />
            </button>

            {/* Logout Button (Desktop) */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>

            {/* User Profile */}
            <button
              onClick={() => navigate('/app/profile')}
              className="w-9 h-9 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-sm transition-transform active:scale-95"
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Menu Toggle (Mobile Only) */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full left-0 shadow-lg animate-in slide-in-from-top-2 duration-200 px-4 py-6 space-y-6">
          
          {/* Mobile Search */}
          <div className="flex items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
            <Search size={16} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search public workspaces..." 
              className="bg-transparent border-none outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
            />
            <button
              onClick={submitSearch}
              className="ml-2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Search"
            >
              <Search size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-4 text-sm font-semibold text-gray-600">
            <button onClick={() => navigate('/docs')} className="text-left px-2 py-2 hover:bg-gray-50 rounded-lg">
              Docs
            </button>
            <button onClick={() => navigate('/pricing')} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-lg">
              <Zap size={16} className="fill-current" />
              Upgrade
            </button>
            
            <div className="h-px bg-gray-100 my-2"></div>

            <button
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg ${
                isNotificationOpen ? 'text-blue-700 bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <Bell size={18} />
              Notifications
            </button>
            <button onClick={() => navigate('/app/profile')} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg">
              <div className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white rounded-full">
                <User size={12} />
              </div>
              Profile
            </button>
            
            {/* Logout Button (Mobile) */}
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-3 px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
    <NotificationDrawer
      isOpen={isNotificationOpen}
      onClose={() => setIsNotificationOpen(false)}
    />
    </>
  );
}
