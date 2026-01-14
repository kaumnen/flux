import { create } from "zustand";

export interface UserInfo {
  account?: string;
  arn?: string;
  userId?: string;
  region: string;
}

interface AuthState {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  isSSO: boolean;
  setAuthenticated: (userInfo: UserInfo, isSSO: boolean) => void;
  setUnauthenticated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userInfo: null,
  isSSO: false,
  setAuthenticated: (userInfo, isSSO) =>
    set({ isAuthenticated: true, userInfo, isSSO }),
  setUnauthenticated: () =>
    set({ isAuthenticated: false, userInfo: null, isSSO: false }),
}));
