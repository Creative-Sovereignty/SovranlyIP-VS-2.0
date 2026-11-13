import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';

export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
};

export function getFirebaseApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  return initializeApp(firebaseConfig);
}

let db: any = null;
let connectionValidated = false;

export const getDb = () => {
  const app = getFirebaseApp();
  if (!db) {
    const rawDbId = firebaseConfig.firestoreDatabaseId?.trim();
    const databaseId =
      rawDbId && rawDbId !== '' && rawDbId !== '(default)' ? rawDbId : undefined;

    if (typeof window === 'undefined') {
      // Server-side shim: avoid browser long-polling delays and noisy gRPC logs
      setLogLevel('silent');
      db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    } else {
      try {
        if (databaseId) {
          db = initializeFirestore(
            app,
            { experimentalForceLongPolling: true },
            databaseId
          );
        } else {
          db = initializeFirestore(app, {
            experimentalForceLongPolling: true,
          });
        }
      } catch {
        db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
      }

      if (!connectionValidated) {
        connectionValidated = true;
        getDocFromServer(doc(db, 'test', 'connection')).catch((error: unknown) => {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error('Please check your Firebase configuration.');
          }
        });
      }
    }
  }
  return db;
};

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  return getAuth(app);
};
