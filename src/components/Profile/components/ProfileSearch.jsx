import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './ProfileSearch.css';

const ProfileSearch = ({ onSelectUser, t, onRefresh, isRefreshing }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const checkCooldown = () => {
      const lastRefresh = localStorage.getItem('sporenext_last_profile_refresh_time');
      if (lastRefresh) {
        const elapsed = Date.now() - Number(lastRefresh);
        if (elapsed < 60000) {
          setCooldown(Math.ceil((60000 - elapsed) / 1000));
          return;
        }
      }
      setCooldown(0);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshClick = () => {
    if (isRefreshing || loading || cooldown > 0) return;
    localStorage.setItem('sporenext_last_profile_refresh_time', Date.now().toString());
    setCooldown(60);
    onRefresh();
  };

  const handleSearch = async () => {
    const cleanQuery = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanQuery) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, description, role, banner_url, banner_position_y, country, last_active_at, created_at')
        .eq('username', cleanQuery)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        onSelectUser(data);
        setQuery('');
      } else {
        setErrorMsg(t('profile.searchNoResults'));
        setTimeout(() => setErrorMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    if (errorMsg) setErrorMsg('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="profile-search-container">
      <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
        <div className="profile-search-bar" style={{ flex: 1 }}>
          <div className="profile-search-input-wrapper">
            <span className="profile-search-prefix">@</span>
            <input
              type="text"
              className="profile-search-input"
              placeholder={t('profile.searchPlaceholder')}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <Search 
            className="profile-search-icon" 
            size={18} 
            onClick={loading ? undefined : handleSearch}
            style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          />
        </div>

        <button
          type="button"
          className="profile-refresh-btn"
          onClick={handleRefreshClick}
          disabled={isRefreshing || loading || cooldown > 0}
          data-tooltip={cooldown > 0 ? `${t('profile.refreshCooldown')} (${cooldown}s)` : t('profile.refreshProfile')}
        >
          {cooldown > 0 ? (
            <span className="profile-cooldown-text" style={{ fontSize: '12px', fontWeight: 'bold' }}>{cooldown}s</span>
          ) : (
            <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="profile-search-error-msg">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default ProfileSearch;
