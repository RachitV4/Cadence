import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Organization } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  needsOnboarding: boolean;
  refreshOrganization: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  organization: null,
  loading: true,
  needsOnboarding: false,
  refreshOrganization: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadProfileAndOrg = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(profileData as Profile | null);

    const { data: memberData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberData) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', memberData.organization_id)
        .maybeSingle();
      setOrganization(orgData as Organization | null);
      setNeedsOnboarding(false);
    } else {
      setOrganization(null);
      setNeedsOnboarding(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfileAndOrg(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(null);
        setOrganization(null);
        setNeedsOnboarding(false);
        setLoading(false);
      } else if (session?.user) {
        (async () => {
          await loadProfileAndOrg(session.user.id);
          setLoading(false);
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfileAndOrg]);

  const refreshOrganization = useCallback(async () => {
    if (user) {
      await loadProfileAndOrg(user.id);
    }
  }, [user, loadProfileAndOrg]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
    setNeedsOnboarding(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, organization, loading, needsOnboarding, refreshOrganization, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
