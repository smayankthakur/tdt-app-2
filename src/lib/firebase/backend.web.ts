import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type Auth,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';

import { FirebaseWebConfig } from '@/constants/config';
import { AuthCancelled, type AppUser, type Backend, type DocData } from '@/lib/firebase/types';

/** Web backend using the Firebase JS SDK (popup sign-in + invisible reCAPTCHA for phone OTP). */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const configured = !!(FirebaseWebConfig.apiKey && FirebaseWebConfig.appId && FirebaseWebConfig.projectId);
if (configured && typeof window !== 'undefined') {
  try {
    app = getApps()[0] ?? initializeApp(FirebaseWebConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {
    app = null;
  }
}
const ready = !!app;

function toUser(u: User | null): AppUser | null {
  if (!u) return null;
  return { uid: u.uid, displayName: u.displayName, email: u.email, phoneNumber: u.phoneNumber, photoURL: u.photoURL };
}

function need(): { auth: Auth; db: Firestore } {
  if (!auth || !db) throw new Error('firebase-not-configured');
  return { auth, db };
}

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

export const backend: Backend = {
  ready,
  supportsApple: false,

  onAuth(cb) {
    if (!auth) {
      cb(null);
      return () => {};
    }
    return onAuthStateChanged(auth, (u) => cb(toUser(u)));
  },

  currentUser() {
    return toUser(auth?.currentUser ?? null);
  },

  async signInGoogle() {
    const { auth: a } = need();
    try {
      await signInWithPopup(a, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code.includes('popup-closed') || code.includes('cancelled')) throw new AuthCancelled();
      throw e;
    }
  },

  async signInApple() {
    throw new Error('apple-not-supported-on-web');
  },

  async startPhone(phone) {
    const { auth: a } = need();
    let el = document.getElementById('recaptcha-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'recaptcha-container';
      document.body.appendChild(el);
    }
    verifier?.clear();
    verifier = new RecaptchaVerifier(a, 'recaptcha-container', { size: 'invisible' });
    confirmation = await signInWithPhoneNumber(a, phone, verifier);
  },

  async confirmPhone(code) {
    if (!confirmation) throw new Error('otp-not-sent');
    await confirmation.confirm(code);
    confirmation = null;
  },

  async signOut() {
    if (auth) await signOut(auth);
  },

  async deleteAccount() {
    const { auth: a } = need();
    const user = a.currentUser;
    if (!user) return;
    const readings = await backend.listDocs(`users/${user.uid}/readings`, { limit: 500 });
    for (const r of readings) await backend.deleteDoc(`users/${user.uid}/readings/${r.id}`);
    await backend.deleteDoc(`users/${user.uid}`);
    await deleteUser(user);
  },

  async getDoc(path) {
    const { db: d } = need();
    const snap = await getDoc(doc(d, path));
    return snap.exists() ? (snap.data() as DocData) : null;
  },

  async setDoc(path, data, merge = true) {
    const { db: d } = need();
    await setDoc(doc(d, path), data, { merge });
  },

  async deleteDoc(path) {
    const { db: d } = need();
    await deleteDoc(doc(d, path));
  },

  async listDocs(collectionPath, opts = {}) {
    const { db: d } = need();
    const parts: QueryConstraint[] = [];
    if (opts.orderBy) parts.push(orderBy(opts.orderBy, opts.desc ? 'desc' : 'asc'));
    if (opts.limit) parts.push(limit(opts.limit));
    const snap = await getDocs(query(collection(d, collectionPath), ...parts));
    return snap.docs.map((x) => ({ id: x.id, ...(x.data() as DocData) }));
  },

  serverTime() {
    return serverTimestamp();
  },
};
