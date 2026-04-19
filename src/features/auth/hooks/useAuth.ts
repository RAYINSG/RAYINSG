import { create } from 'zustand';
import { User } from '../../../types';
import {
  loginWithEmail,
  registerWithEmail,
  logout as firebaseLogout,
  resetPassword,
  subscribeToAuthState,
} from '../../../services/firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  initialize: () => () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: () => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          },
          initialized: true,
        });
      } else {
        set({ user: null, initialized: true });
      }
    });
    return unsubscribe;
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      await loginWithEmail(email, password);
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, name) => {
    set({ loading: true });
    try {
      await registerWithEmail(email, password, name);
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await firebaseLogout();
  },

  sendReset: async (email) => {
    await resetPassword(email);
  },
}));
