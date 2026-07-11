"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { ManagerProfile, onAuthChange, getManagerProfile } from "./auth";

interface AuthContextType {
  user: User | null;
  profile: ManagerProfile | null;
  loading: boolean;
  isGM: boolean;
  isAGM: boolean;
  isAssistant: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isGM: false,
  isAGM: false,
  isAssistant: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const managerProfile = await getManagerProfile(firebaseUser.uid);
        setProfile(managerProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isGM = profile?.role === "general_manager";
  const isAGM = profile?.role === "agm";
  const isAssistant = profile?.role === "assistant_manager";

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGM, isAGM, isAssistant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
