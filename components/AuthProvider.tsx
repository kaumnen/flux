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
  const lastInitialState = useRef<AuthProviderProps["initialState"]>(null);

  if (!hasHydrated.current) {
    hasHydrated.current = true;
    lastInitialState.current = initialState;
    hydrate(initialState);
  }

  useEffect(() => {
    if (lastInitialState.current !== initialState) {
      lastInitialState.current = initialState;
      hydrate(initialState);
    }
  }, [initialState, hydrate]);

  return <>{children}</>;
}
