import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AccessState {
  loading: boolean;
  hasAccess: boolean;
  accessLevel: 'lifetime' | 'annual' | null;
  status: 'active' | 'revoked' | 'expired' | 'none' | 'error' | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  refresh: () => Promise<void>;
}

export function useAccessCheck(): AccessState {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<{
    access_level: 'lifetime' | 'annual';
    status: 'active' | 'revoked';
    access_expires_at: string | null;
  } | null>(null);
  const [noRow, setNoRow] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from('member_access')
      .select('access_level, status, access_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('access check error:', error.message);
      setLoadError(true);
      setLoading(false);
      return;
    }
    setRow((data as any) ?? null);
    setNoRow(!data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  if (authLoading || loading) {
    return {
      loading: true,
      hasAccess: false,
      accessLevel: null,
      status: null,
      expiresAt: null,
      daysUntilExpiry: null,
      refresh: load,
    };
  }

  if (!user) {
    return {
      loading: false,
      hasAccess: false,
      accessLevel: null,
      status: null,
      expiresAt: null,
      daysUntilExpiry: null,
      refresh: load,
    };
  }

  if (loadError) {
    return {
      loading: false,
      hasAccess: false,
      accessLevel: null,
      status: 'error',
      expiresAt: null,
      daysUntilExpiry: null,
      refresh: load,
    };
  }

  if (noRow || !row) {
    return {
      loading: false,
      hasAccess: false,
      accessLevel: null,
      status: 'none',
      expiresAt: null,
      daysUntilExpiry: null,
      refresh: load,
    };
  }

  const now = Date.now();
  const expiresMs = row.access_expires_at ? new Date(row.access_expires_at).getTime() : null;
  const expired = row.access_level === 'annual' && expiresMs !== null && expiresMs < now;
  const isRevoked = row.status === 'revoked';
  const hasAccess = !isRevoked && !expired;
  const daysUntilExpiry =
    expiresMs !== null ? Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)) : null;

  return {
    loading: false,
    hasAccess,
    accessLevel: row.access_level,
    status: isRevoked ? 'revoked' : expired ? 'expired' : 'active',
    expiresAt: row.access_expires_at,
    daysUntilExpiry,
    refresh: load,
  };
}
