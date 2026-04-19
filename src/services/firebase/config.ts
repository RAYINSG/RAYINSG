import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDpUGL92lqNOLph5qiFMvNNvyBDXiv9jW8',
  authDomain: 'homestore-19074.firebaseapp.com',
  projectId: 'homestore-19074',
  storageBucket: 'homestore-19074.firebasestorage.app',
  messagingSenderId: '587917010961',
  appId: '1:587917010961:web:8b1bdfa6a8c01878ab29b0',
  measurementId: 'G-WTSFHSXZVF',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);
export const storage = getStorage(app);
