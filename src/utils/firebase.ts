import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const isConfigured =
  Boolean(firebaseConfig?.projectId) &&
  firebaseConfig.projectId !== 'remixed-project-id' &&
  Boolean(firebaseConfig?.apiKey);

export const firebaseApp = isConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const db =
  firebaseApp && firebaseConfig.firestoreDatabaseId
    ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
    : firebaseApp
      ? getFirestore(firebaseApp)
      : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function isFirebaseReady(): boolean {
  return Boolean(auth);
}

export async function signInWithGooglePopup(): Promise<{
  idToken: string;
  email: string;
  displayName: string;
  photoURL: string;
}> {
  if (!auth) {
    throw new Error('لم يتم تهيئة خدمة المصادقة السحابية بعد.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email || '',
    displayName: result.user.displayName || '',
    photoURL: result.user.photoURL || '',
  };
}

export async function signInFirebaseWithEmail(
  email: string,
  password: string
): Promise<{ idToken: string } | null> {
  if (!auth) return null;
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await result.user.getIdToken();
    return { idToken };
  } catch {
    return null;
  }
}

export async function sendFirebaseResetEmail(
  email: string
): Promise<{ sent: boolean; reason?: 'not-configured' | 'not-enabled' | 'failed' }> {
  if (!auth) return { sent: false, reason: 'not-configured' };
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { sent: true };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code || '')
        : '';
    if (code === 'auth/operation-not-allowed') {
      return { sent: false, reason: 'not-enabled' };
    }
    return { sent: false, reason: 'failed' };
  }
}

export async function signOutFirebase(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch {
    // Ignore client signOut errors
  }
}
