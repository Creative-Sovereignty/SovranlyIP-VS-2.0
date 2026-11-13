import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';

export function ensureAdminApp(): boolean {
  if (getApps().length > 0) return true;
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    firebaseAppletConfig.projectId;

  try {
    initializeApp({
      projectId,
    });
    return true;
  } catch (err) {
    console.error('Failed to initialize firebase-admin SDK:', err);
    return false;
  }
}

// Initial attempt at module load
ensureAdminApp();

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
  firebase?: {
    sign_in_provider?: string;
    [key: string]: any;
  };
}

function isSandboxAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export async function verifyAuthToken(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  const token = parts[1];
  if (!token) return null;

  if (token === 'sandbox-token-123' && isSandboxAllowed()) {
    return {
      uid: 'sandbox-guest-agent-007',
      email: 'create@sovranlyip.com',
      name: 'Sovereign Sandbox Agent',
      emailVerified: true,
    };
  }

  const isInitialized = ensureAdminApp();
  if (isInitialized) {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        emailVerified: decodedToken.email_verified,
      };
    } catch (error) {
      console.warn('Firebase token verification failed:', error);
    }
  }

  return null;
}
