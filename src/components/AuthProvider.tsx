import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
          console.warn("Session expired or invalid refresh token. User will be signed out.");
        } else {
          console.error("Error getting session:", error);
        }
        // Clear local storage to remove invalid tokens
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
        // If there's an error with the session (like invalid refresh token), sign out
        supabase.auth.signOut().catch(() => {
          // Ignore sign out errors if we're already in an error state
        });
      }
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(error => {
      if (error?.message?.includes("Refresh Token Not Found") || error?.message?.includes("Invalid Refresh Token")) {
        console.warn("Session expired or invalid refresh token. User will be signed out.");
      } else {
        console.error("Exception getting session:", error);
      }
      // Clear local storage to remove invalid tokens
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      // Force clear local storage if sign out fails
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
