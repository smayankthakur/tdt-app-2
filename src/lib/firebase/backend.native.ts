/* eslint-disable @typescript-eslint/no-require-imports */
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { GoogleWebClientId } from '@/constants/config';
import { AuthCancelled, type AppUser, type Backend, type DocData } from '@/lib/firebase/types';

/**
 * Native backend (Android / iOS) using @react-native-firebase.
 * Every native module is loaded with require() inside try/catch so the app never
 * crashes when a module is missing (e.g. Expo Go, or a build made before
 * google-services.json was added) — it simply runs in guest mode.
 */
 
type Any = any;

let appMod: Any = null;
let authMod: Any = null;
let fsMod: Any = null;
let ready = false;
try {
  appMod = require('@react-native-firebase/app');
  ready = Array.isArray(appMod.getApps?.()) && appMod.getApps().length > 0;
  if (ready) {
    authMod = require('@react-native-firebase/auth');
    fsMod = require('@react-native-firebase/firestore');
  }
} catch {
  ready = false;
}

function toUser(u: Any): AppUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    displayName: u.displayName ?? null,
    email: u.email ?? null,
    phoneNumber: u.phoneNumber ?? null,
    photoURL: u.photoURL ?? null,
  };
}

const auth = () => authMod.getAuth();
const db = () => fsMod.getFirestore();
const exists = (snap: Any) => (typeof snap.exists === 'function' ? snap.exists() : !!snap.exists);

let confirmation: Any = null;

function requireReady() {
  if (!ready) throw new Error('firebase-not-configured');
}

export const backend: Backend = {
  ready,
  supportsApple: Platform.OS === 'ios',

  onAuth(cb) {
    if (!ready) {
      cb(null);
      return () => {};
    }
    return authMod.onAuthStateChanged(auth(), (u: Any) => cb(toUser(u)));
  },

  currentUser() {
    return ready ? toUser(auth().currentUser) : null;
  },

  async signInGoogle() {
    requireReady();
    const gs = require('@react-native-google-signin/google-signin');
    // 'autoDetect' is only understood by the Universal (One Tap) module; the original GoogleSignin
    // would pass it to Google as a client ID and fail with DEVELOPER_ERROR.
    gs.GoogleSignin.configure(GoogleWebClientId ? { webClientId: GoogleWebClientId } : {});
    if (Platform.OS === 'android') await gs.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await gs.GoogleSignin.signIn();
    if (!gs.isSuccessResponse(res)) throw new AuthCancelled();
    const idToken = res.data?.idToken;
    if (!idToken) throw new Error('google-no-id-token');
    await authMod.signInWithCredential(auth(), authMod.GoogleAuthProvider.credential(idToken));
  },

  async signInApple() {
    requireReady();
    const Apple = require('expo-apple-authentication');
    const rawNonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    let cred: Any;
    try {
      cred = await Apple.signInAsync({
        requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
    } catch (e: Any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') throw new AuthCancelled();
      throw e;
    }
    if (!cred.identityToken) throw new Error('apple-no-token');
    await authMod.signInWithCredential(auth(), authMod.AppleAuthProvider.credential(cred.identityToken, rawNonce));
  },

  async startPhone(phone) {
    requireReady();
    confirmation = await authMod.signInWithPhoneNumber(auth(), phone);
  },

  async confirmPhone(code) {
    requireReady();
    if (!confirmation) throw new Error('otp-not-sent');
    await confirmation.confirm(code);
    confirmation = null;
  },

  async signOut() {
    if (!ready) return;
    try {
      const gs = require('@react-native-google-signin/google-signin');
      await gs.GoogleSignin.signOut();
    } catch {
      // not signed in with Google
    }
    await authMod.signOut(auth());
  },

  async deleteAccount() {
    requireReady();
    const user = auth().currentUser;
    if (!user) return;
    const readings = await backend.listDocs(`users/${user.uid}/readings`, { limit: 500 });
    for (const r of readings) await backend.deleteDoc(`users/${user.uid}/readings/${r.id}`);
    await backend.deleteDoc(`users/${user.uid}`);
    await authMod.deleteUser(user);
  },

  async getDoc(path) {
    requireReady();
    const snap = await fsMod.getDoc(fsMod.doc(db(), path));
    return exists(snap) ? (snap.data() as DocData) : null;
  },

  async setDoc(path, data, merge = true) {
    requireReady();
    await fsMod.setDoc(fsMod.doc(db(), path), data, { merge });
  },

  async deleteDoc(path) {
    requireReady();
    await fsMod.deleteDoc(fsMod.doc(db(), path));
  },

  async listDocs(collectionPath, opts = {}) {
    requireReady();
    const parts: Any[] = [];
    if (opts.orderBy) parts.push(fsMod.orderBy(opts.orderBy, opts.desc ? 'desc' : 'asc'));
    if (opts.limit) parts.push(fsMod.limit(opts.limit));
    const q = fsMod.query(fsMod.collection(db(), collectionPath), ...parts);
    const snap = await fsMod.getDocs(q);
    return snap.docs.map((d: Any) => ({ id: d.id, ...(d.data() as DocData) }));
  },

  serverTime() {
    return ready ? fsMod.serverTimestamp() : Date.now();
  },
};
