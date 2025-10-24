'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          'Automatic initialization failed. Falling back to firebase config object.',
          e
        );
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  
  // Try to initialize storage, but don't fail if it's not available
  let storage = null;
  try {
    storage = getStorage(firebaseApp);
    console.log('Firebase Storage initialized successfully');
  } catch (error) {
    console.warn('Firebase Storage not available:', error);
    // Storage is not available, but we can still provide other services
  }
  
  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

export async function seedAvatarAssets(firestore: ReturnType<typeof getFirestore>, assets: Array<{id: string; type: 'hair'|'eyes'|'clothes'|'body'; url: string; name: string;}>) {
  for (const a of assets) {
    await setDoc(doc(firestore, 'avatarAssets', a.id), { type: a.type, name: a.name, imageUrl: a.url });
  }
}

export async function seedShopItems(firestore: ReturnType<typeof getFirestore>, items: Array<{id: string; name: string; price: number; imageUrl: string;}>) {
  for (const i of items) {
    await setDoc(doc(firestore, 'shopItems', i.id), { name: i.name, price: i.price, imageUrl: i.imageUrl });
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
