'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import {
  BIOMETRIC_ANCHOR_EVENT,
  BiometricAnchorRecord,
  clearSessionBiometricVerification,
  getBiometricAnchor,
  isSessionBiometricVerified,
  recordBiometricSessionVerification,
} from '@/lib/biometric-anchor';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  biometricLoading: boolean;
  biometricVerified: boolean;
  biometricAnchor: BiometricAnchorRecord | null;
  signInWithGoogle: () => Promise<void>;
  signInWithSandbox: () => Promise<void>;
  verifyBiometricSession: (anchor: BiometricAnchorRecord) => Promise<void>;
  refreshBiometricAnchor: () => Promise<BiometricAnchorRecord | null>;
  lockBiometricSession: () => void;
  logout: () => Promise<void>;
  isSandboxMode: boolean;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  biometricLoading: false,
  biometricVerified: false,
  biometricAnchor: null,
  signInWithGoogle: async () => {},
  signInWithSandbox: async () => {},
  verifyBiometricSession: async () => {},
  refreshBiometricAnchor: async () => null,
  lockBiometricSession: () => {},
  logout: async () => {},
  isSandboxMode: false,
  accessToken: null,
  setAccessToken: () => {},
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricAnchor, setBiometricAnchor] = useState<BiometricAnchorRecord | null>(null);

  const syncBiometricState = useCallback(
    async (activeUser: User | null, sandboxFlag: boolean) => {
      if (!activeUser?.uid) {
        setBiometricAnchor(null);
        setBiometricVerified(false);
        setBiometricLoading(false);
        return null;
      }

      setBiometricLoading(true);
      try {
        const anchor = await getBiometricAnchor(activeUser.uid, sandboxFlag);
        setBiometricAnchor(anchor);
        const verified = isSessionBiometricVerified(activeUser.uid, anchor);
        setBiometricVerified(verified);
        return anchor;
      } catch (err) {
        console.error('Failed to sync biometric anchor state:', err);
        setBiometricVerified(false);
        return null;
      } finally {
        setBiometricLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAnchorEvent = (e: Event) => {
      const custom = e as CustomEvent<BiometricAnchorRecord>;
      if (custom.detail && user?.uid && custom.detail.uid === user.uid) {
        setBiometricAnchor(custom.detail);
        setBiometricVerified(isSessionBiometricVerified(user.uid, custom.detail));
      }
    };

    window.addEventListener(BIOMETRIC_ANCHOR_EVENT, handleAnchorEvent);
    return () => {
      window.removeEventListener(BIOMETRIC_ANCHOR_EVENT, handleAnchorEvent);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const msg = reason?.message || '';
        const name = reason?.name || '';
        if (
          name === 'AbortError' ||
          msg.includes('IndexedDB') ||
          msg.includes('idb-') ||
          msg.includes('database connection is closing') ||
          msg.includes('transaction was aborted') ||
          msg.includes('Unable to create writable file') ||
          msg.includes('Connection to Indexed Database')
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          console.warn('Suppressing benign IndexedDB/AbortError in iframe sandbox:', reason);
        }
      };
      window.addEventListener('unhandledrejection', handleRejection, true);

      const handleError = (event: ErrorEvent) => {
        const msg = event.message || '';
        if (
          msg.includes('Connection to Indexed Database') ||
          msg.includes('Indexed Database') ||
          msg.includes('IndexedDB') ||
          msg.includes('indexeddb') ||
          msg.includes('idb-') ||
          msg.includes('database connection is closing')
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          console.warn('Suppressing benign IndexedDB error in iframe sandbox:', msg);
        }
      };
      window.addEventListener('error', handleError, true);

      const auth = getFirebaseAuth();

      // Check local storage for sandbox user first
      const savedSandboxUser = localStorage.getItem('sovranly_sandbox_user');
      if (savedSandboxUser) {
        try {
          const parsed = JSON.parse(savedSandboxUser) as User;
          setTimeout(() => {
            setUser(parsed);
            setIsSandboxMode(true);
            setAccessToken('sandbox-token-123');
            syncBiometricState(parsed, true).finally(() => setLoading(false));
          }, 0);
          window.removeEventListener('unhandledrejection', handleRejection, true);
          window.removeEventListener('error', handleError, true);
          return;
        } catch {
          localStorage.removeItem('sovranly_sandbox_user');
        }
      }

      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              setAccessToken(credential.accessToken);
            }
            clearSessionBiometricVerification(result.user.uid);
            setUser(result.user);
            setIsSandboxMode(false);
            syncBiometricState(result.user, false);
          }
        })
        .catch((err) => {
          console.warn('getRedirectResult warning:', err);
        });

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          setIsSandboxMode(false);
          syncBiometricState(firebaseUser, false).finally(() => setLoading(false));
        } else {
          setUser(null);
          setAccessToken(null);
          setBiometricAnchor(null);
          setBiometricVerified(false);
          setBiometricLoading(false);
          setLoading(false);
        }
      });

      return () => {
        unsubscribe();
        window.removeEventListener('unhandledrejection', handleRejection, true);
        window.removeEventListener('error', handleError, true);
      };
    }
  }, [syncBiometricState]);

  const signInWithGoogle = async () => {
    let inIframeOrPreview = false;
    if (typeof window !== 'undefined') {
      try {
        inIframeOrPreview =
          window.self !== window.top ||
          window.location.hostname.includes('.run.app') ||
          window.location.hostname.includes('localhost') ||
          window.location.hostname.includes('127.0.0.1');
      } catch {
        inIframeOrPreview = true;
      }
    }

    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Google Slides, Google Drive, and Gmail scopes requested by the applet
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/presentations');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/gmail.send');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
      // Require fresh Face-ID verification on every explicit login sequence
      clearSessionBiometricVerification(result.user.uid);
      setBiometricVerified(false);
      setUser(result.user);
      setIsSandboxMode(false);
      await syncBiometricState(result.user, false);
    } catch (e: unknown) {
      console.warn('signInWithPopup failed or was restricted in frame:', e);

      if (inIframeOrPreview) {
        console.info('Preview or iframe environment detected: activating Sovereign Sandbox pass.');
        await signInWithSandbox();
        return;
      }

      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error('signInWithRedirect failed:', redirectErr);
        await signInWithSandbox();
      }
    }
  };

  const signInWithSandbox = async () => {
    const fakeUser = {
      uid: 'sandbox-guest-agent-007',
      displayName: 'Sovereign Sandbox Agent',
      email: 'create@sovranlyip.com',
      photoURL: '/duane_portrait.jpg',
      emailVerified: true,
      metadata: {},
      providerData: [],
    } as unknown as User;

    clearSessionBiometricVerification(fakeUser.uid);
    setBiometricVerified(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('sovranly_sandbox_user', JSON.stringify(fakeUser));
    }
    setUser(fakeUser);
    setIsSandboxMode(true);
    setAccessToken('sandbox-token-123');
    await syncBiometricState(fakeUser, true);
  };

  const verifyBiometricSession = useCallback(
    async (anchor: BiometricAnchorRecord) => {
      if (!user?.uid) return;
      const updated = await recordBiometricSessionVerification(user.uid, anchor, isSandboxMode);
      setBiometricAnchor(updated);
      setBiometricVerified(true);
    },
    [user?.uid, isSandboxMode]
  );

  const refreshBiometricAnchor = useCallback(async () => {
    return syncBiometricState(user, isSandboxMode);
  }, [syncBiometricState, user, isSandboxMode]);

  const lockBiometricSession = useCallback(() => {
    clearSessionBiometricVerification(user?.uid);
    setBiometricVerified(false);
  }, [user?.uid]);

  const logout = async () => {
    const auth = getFirebaseAuth();
    clearSessionBiometricVerification(user?.uid);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sovranly_sandbox_user');
    }
    setUser(null);
    setIsSandboxMode(false);
    setAccessToken(null);
    setBiometricAnchor(null);
    setBiometricVerified(false);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricLoading,
        biometricVerified,
        biometricAnchor,
        signInWithGoogle,
        signInWithSandbox,
        verifyBiometricSession,
        refreshBiometricAnchor,
        lockBiometricSession,
        logout,
        isSandboxMode,
        accessToken,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
