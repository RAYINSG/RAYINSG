import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from './config';

export function configureGoogleSignIn(webClientId: string) {
  GoogleSignin.configure({ webClientId });
}

export async function registerWithEmail(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const { data } = await GoogleSignin.signIn();
  const credential = GoogleAuthProvider.credential(data?.idToken ?? null);
  return signInWithCredential(auth, credential);
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (user) await sendEmailVerification(user);
}

export async function reloadUser() {
  await auth.currentUser?.reload();
  return auth.currentUser;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout() {
  try {
    await GoogleSignin.signOut();
  } catch {}
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
