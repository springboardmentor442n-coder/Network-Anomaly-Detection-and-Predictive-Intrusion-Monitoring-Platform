import React, { useState } from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: mlStatus } = useQuery({
    queryKey: ['ml-status'],
    queryFn: () => api.get('/ml/status').then(r => r.data),
    refetchInterval: 30000,
    retry: false,
  });

  return (
    <div className="topbar">
      {/* Title */}
      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', flex: 1 }}>
        {title}
      </div>

      {/* ML Status indicator */}
      {mlStatus && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 4,
          background: mlStatus.demo_mode ? 'rgba(234,179,8,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${mlStatus.demo_mode ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)'}`,
          color: mlStatus.demo_mode ? 'var(--severity-medium)' : 'var(--severity-low)',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: mlStatus.demo_mode ? 'var(--severity-medium)' : 'var(--severity-low)',
          }} />
          {mlStatus.demo_mode ? 'DEMO MODE' : 'CICIDS2017 ACTIVE'}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
        }} />
        <input
          className="form-input"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32, width: 200, padding: '6px 12px 6px 30px', fontSize: 12 }}
        />
      </div>

      {/* Notifications */}
      <button className="btn-icon">
        <Bell size={16} />
      </button>

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={16} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
            {user?.username}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {user?.role?.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
}
