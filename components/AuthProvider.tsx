"use client";

import { useEffect, useRef } from "react";
import { type AuthState, useAuthStore } from "@/lib/stores/auth-store";

interface AuthProviderProps {
  children: React.ReactNode;
  initialState: Omit<AuthState, "isHydrated"> | null;
}

export function AuthProvider({ children, initialState }: AuthProviderProps) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hasHydrated = useRef(false);

  if (!hasHydrated.current) {
    hasHydrated.current = true;
    hydrate(initialState);
  }

  useEffect(() => {
    hydrate(initialState);
  }, [initialState, hydrate]);

  return <>{children}</>;
}
