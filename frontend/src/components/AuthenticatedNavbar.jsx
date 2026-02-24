import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Bell, Zap, Search, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { NotificationDrawer } from '../pages/account/Notification';
import api, { clearApiCache } from '../api';
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

  const handleLogout = () => {
    clearApiCache();
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
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
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
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
        params: { q: debouncedSearchQuery, limit: SEARCH_DROPDOWN_LIMIT, offset: 0 },
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');

        .nav-root {
          font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .nav-inner {
          height: 56px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1400px;
          margin: 0 auto;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-brand img {
          height: 26px;
          width: auto;
        }

        .nav-brand-text {
          font-size: 15px;
          font-weight: 700;
          color: #0a0a0a;
          letter-spacing: -0.4px;
          display: flex;
          align-items: center;
          gap: 0;
        }

        .nav-brand-accent {
          color: #2563eb;
        }

        .nav-brand-badge {
          margin-left: 7px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 2px 5px;
          border-radius: 4px;
        }

        /* Search */
        .nav-search-wrap {
          position: relative;
          width: 280px;
        }

        .nav-search-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0 12px;
          height: 36px;
          transition: all 0.15s ease;
        }

        .nav-search-input-row:focus-within {
          background: #fff;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .nav-search-input-row svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .nav-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: #1e293b;
          font-family: inherit;
        }

        .nav-search-input::placeholder { color: #94a3b8; }

        .nav-search-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition: color 0.1s;
        }
        .nav-search-btn:hover { color: #475569; }

        .nav-search-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
          overflow: hidden;
          z-index: 90;
          animation: dropIn 0.12s ease;
        }

        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .nav-search-empty {
          padding: 12px 14px;
          font-size: 12.5px;
          color: #94a3b8;
        }

        .nav-search-result-list {
          max-height: 280px;
          overflow-y: auto;
        }

        .nav-search-result-item {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.1s;
          font-family: inherit;
        }
        .nav-search-result-item:last-child { border-bottom: none; }
        .nav-search-result-item:hover { background: #f8fafc; }

        .nav-search-result-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-search-result-desc {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-search-view-all {
          width: 100%;
          text-align: left;
          background: #f8fafc;
          border: none;
          border-top: 1px solid #e2e8f0;
          padding: 10px 14px;
          font-size: 12.5px;
          font-weight: 600;
          color: #2563eb;
          cursor: pointer;
          transition: background 0.1s;
          font-family: inherit;
        }
        .nav-search-view-all:hover { background: #eff6ff; }

        /* Right side */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .nav-link-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          padding: 6px 10px;
          border-radius: 6px;
          transition: color 0.1s, background 0.1s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .nav-link-btn:hover { color: #0a0a0a; background: #f1f5f9; }

        .nav-upgrade-btn {
          background: #0a0a0a;
          color: #fff;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: background 0.15s, transform 0.1s;
          letter-spacing: -0.1px;
        }
        .nav-upgrade-btn:hover { background: #1e293b; }
        .nav-upgrade-btn:active { transform: scale(0.98); }

        .nav-divider {
          width: 1px;
          height: 20px;
          background: #e2e8f0;
          margin: 0 6px;
        }

        .nav-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 7px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.1s, background 0.1s;
          position: relative;
        }
        .nav-icon-btn:hover { color: #1e293b; background: #f1f5f9; }
        .nav-icon-btn.active { color: #2563eb; background: #eff6ff; }

        .nav-icon-btn.danger:hover { color: #dc2626; background: #fef2f2; }

        .nav-avatar-btn {
          background: #0a0a0a;
          border: none;
          cursor: pointer;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.1s, transform 0.1s;
          margin-left: 2px;
        }
        .nav-avatar-btn:hover { background: #1e293b; }
        .nav-avatar-btn:active { transform: scale(0.95); }

        /* Mobile */
        .nav-mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #475569;
          padding: 6px;
          border-radius: 7px;
          transition: background 0.1s;
        }
        .nav-mobile-toggle:hover { background: #f1f5f9; }

        .nav-mobile-drawer {
          border-top: 1px solid #f1f5f9;
          background: #fff;
          position: absolute;
          width: 100%;
          left: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,0.08);
          padding: 16px;
          animation: dropIn 0.15s ease;
        }

        .nav-mobile-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0 12px;
          height: 40px;
          margin-bottom: 12px;
        }
        .nav-mobile-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 13.5px;
          color: #1e293b;
          font-family: inherit;
        }
        .nav-mobile-search input::placeholder { color: #94a3b8; }

        .nav-mobile-menu-items {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-mobile-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          background: none;
          border: none;
          text-align: left;
          font-family: inherit;
          transition: background 0.1s, color 0.1s;
          width: 100%;
        }
        .nav-mobile-item:hover { background: #f8fafc; color: #0a0a0a; }
        .nav-mobile-item.danger { color: #dc2626; }
        .nav-mobile-item.danger:hover { background: #fef2f2; }

        .nav-mobile-sep {
          height: 1px;
          background: #f1f5f9;
          margin: 6px 0;
        }

        @media (max-width: 1023px) {
          .nav-search-wrap { display: none; }
        }
        @media (max-width: 767px) {
          .nav-right { display: none; }
          .nav-mobile-toggle { display: flex; }
        }
      `}</style>

      <nav className="nav-root">
        <div className="nav-inner">
          {/* Brand */}
          <div className="nav-brand" onClick={() => navigate('/app')}>
            <img src={logo} alt="structra logo" />
            <span className="nav-brand-text">
              structra<span className="nav-brand-accent">.cloud</span>
              <span className="nav-brand-badge">Beta</span>
            </span>
          </div>

          {/* Desktop Search */}
          <div className="nav-search-wrap" ref={searchContainerRef}>
            <div className="nav-search-input-row">
              <Search size={14} />
              <input
                type="text"
                className="nav-search-input"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchDropdownOpen(true); }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search public workspaces..."
              />
              <button className="nav-search-btn" onClick={submitSearch} title="Search">
                <Search size={13} />
              </button>
            </div>

            {isSearchDropdownOpen && (
              <div className="nav-search-dropdown">
                {!debouncedSearchQuery ? (
                  <div className="nav-search-empty">Type to search public workspaces.</div>
                ) : isSearchLoading ? (
                  <div className="nav-search-empty">Searching…</div>
                ) : searchError ? (
                  <div className="nav-search-empty" style={{ color: '#ef4444' }}>{searchError}</div>
                ) : searchResults.length === 0 ? (
                  <div className="nav-search-empty">No public workspaces found.</div>
                ) : (
                  <>
                    <div className="nav-search-result-list">
                      {searchResults.map((ws) => (
                        <button
                          key={ws.id}
                          className="nav-search-result-item"
                          onClick={() => { setIsSearchDropdownOpen(false); navigate(`/app/ws/${ws.id}`); }}
                        >
                          <div className="nav-search-result-name">{ws.name}</div>
                          <div className="nav-search-result-desc">{ws.description || 'No description'}</div>
                        </button>
                      ))}
                    </div>
                    <button className="nav-search-view-all" onClick={submitSearch}>
                      View all results →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop Right */}
          <div className="nav-right">
            <button className="nav-link-btn" onClick={() => navigate('/docs')}>Docs</button>
            <button className="nav-upgrade-btn" onClick={() => navigate('/pricing')}>
              <Zap size={13} style={{ fill: 'currentColor' }} />
              Upgrade
            </button>

            <div className="nav-divider" />

            <button
              className={`nav-icon-btn ${isNotificationOpen ? 'active' : ''}`}
              onClick={() => setIsNotificationOpen((p) => !p)}
              title="Notifications"
            >
              <Bell size={18} />
            </button>

            <button
              className="nav-icon-btn danger"
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut size={18} />
            </button>

            <button
              className="nav-avatar-btn"
              onClick={() => navigate('/app/profile')}
              title="Profile"
            >
              <User size={15} />
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="nav-mobile-drawer">
            <div className="nav-mobile-search">
              <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search public workspaces..."
              />
              <button className="nav-search-btn" onClick={submitSearch}><Search size={13} /></button>
            </div>

            <div className="nav-mobile-menu-items">
              <button className="nav-mobile-item" onClick={() => navigate('/docs')}>
                <span>📄</span> Docs
              </button>
              <button className="nav-mobile-item" onClick={() => navigate('/pricing')}>
                <Zap size={16} /> Upgrade to Pro
              </button>
              <div className="nav-mobile-sep" />
              <button
                className={`nav-mobile-item ${isNotificationOpen ? 'active' : ''}`}
                onClick={() => { setIsNotificationOpen((p) => !p); setIsMobileMenuOpen(false); }}
              >
                <Bell size={16} /> Notifications
              </button>
              <button className="nav-mobile-item" onClick={() => navigate('/app/profile')}>
                <User size={16} /> Profile
              </button>
              <div className="nav-mobile-sep" />
              <button className="nav-mobile-item danger" onClick={handleLogout}>
                <LogOut size={16} /> Log out
              </button>
            </div>
          </div>
        )}
      </nav>

      <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
    </>
  );
}