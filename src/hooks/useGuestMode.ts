import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GUEST_KEY = "rufayq_guest_ok";

const hasGuestFlag = () => {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
};

export const useGuestMode = () => {
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    const sync = (uid: string | null) => {
      if (!mounted) return;
      setIsGuest(!uid && hasGuestFlag());
    };

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      sync(session?.user?.id || null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user?.id || null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isGuest;
};