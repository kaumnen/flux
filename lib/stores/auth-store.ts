import { create } from "zustand";

export interface UserInfo {
  account?: string;
  arn?: string;
  userId?: string;
  region: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  isSSO: boolean;
  isHydrated: boolean;
}

interface AuthActions {
  setAuthenticated: (userInfo: UserInfo, isSSO: boolean) => void;
  setUnauthenticated: () => void;
  hydrate: (state: Omit<AuthState, "isHydrated"> | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isAuthenticated: false,
  userInfo: null,
  isSSO: false,
  isHydrated: false,
  setAuthenticated: (userInfo, isSSO) =>
    set({ isAuthenticated: true, userInfo, isSSO }),
  setUnauthenticated: () =>
    set({ isAuthenticated: false, userInfo: null, isSSO: false }),
  hydrate: (state) => {
    if (state) {
      set({
        isAuthenticated: state.isAuthenticated,
        userInfo: state.userInfo,
        isSSO: state.isSSO,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },
}));
