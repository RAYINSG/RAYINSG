import { create } from 'zustand';
import { User } from '../../../types';
import {
  loginWithEmail,
  loginWithGoogle as firebaseLoginWithGoogle,
  registerWithEmail,
  logout as firebaseLogout,
  resetPassword,
  resendVerificationEmail,
  reloadUser,
  subscribeToAuthState,
  configureGoogleSignIn,
} from '../../../services/firebase/auth';

const GOOGLE_WEB_CLIENT_ID = '587917010961-1g3qg98c4edtfeegs72jlqp05bp1hbth.apps.googleusercontent.com';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkVerification: () => Promise<boolean>;
  initialize: () => () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: () => {
    configureGoogleSignIn(GOOGLE_WEB_CLIENT_ID);
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            emailVerified: firebaseUser.emailVerified,
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
      const firebaseUser = await loginWithEmail(email, password);
      set({
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
        },
        loading: false,
      });
      return firebaseUser;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true });
    try {
      await firebaseLoginWithGoogle();
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

  resendVerification: async () => {
    await resendVerificationEmail();
  },

  checkVerification: async () => {
    const user = await reloadUser();
    if (user) {
      set((state) => ({
        user: state.user ? { ...state.user, emailVerified: user.emailVerified } : null,
      }));
      return user.emailVerified;
    }
    return false;
  },
}));
