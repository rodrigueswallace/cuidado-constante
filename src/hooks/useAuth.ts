import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Session } from '@supabase/supabase-js';

import { authService } from '@/services/auth';
import { supabase } from '@/services/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const syncSessionFromUrl = async (url: string | null) => {
      if (!url) return;
      const { error } = await authService.setSessionFromUrl(url);
      if (error) {
        console.log('AUTH DEEP LINK ERROR =>', error.message);
      }
    };

    Linking.getInitialURL().then(syncSessionFromUrl);

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      syncSessionFromUrl(url);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }

      if (event === 'SIGNED_OUT') {
        setIsRecoveringPassword(false);
      }

      setSession(currentSession);
    });

    return () => {
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return {
    session,
    loading,
    isRecoveringPassword,
    clearPasswordRecovery: () => setIsRecoveringPassword(false)
  };
}
