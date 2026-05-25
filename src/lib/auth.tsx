import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import type { Profile, UserRole } from '../types/db';
import { getHomePathForRole, isApprovedProfile } from './authorization';
import { AuthContext, useAuth } from './use-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrate(s: Session | null) {
      if (!s) {
        if (!active) return;
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, status, phone, department, bio, created_at')
        .eq('id', s.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error('Failed to hydrate auth profile:', error);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (!data) {
        console.warn('Session exists but no matching profile row was found.', {
          userId: s.user.id,
          email: s.user.email,
        });
      }
      setProfile((data as Profile | null) ?? null);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      hydrate(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(true);
      hydrate(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
function Checking() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-navy/40 text-sm">جارٍ التحقق...</div>
    </div>
  );
}

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { profile, loading, session } = useAuth();
  if (loading) return <Checking />;
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (!isApprovedProfile(profile)) return <Navigate to="/login" replace />;
  if (profile.role !== role) {
    return <Navigate to={getHomePathForRole(profile.role)} replace />;
  }
  return <>{children}</>;
}
