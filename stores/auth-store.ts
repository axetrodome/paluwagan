import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthState = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  setSession: (session: Session | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isReady: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setReady: (isReady) => set({ isReady }),
}));
