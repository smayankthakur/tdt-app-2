export type AppUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
};

export type DocData = Record<string, unknown>;

/**
 * Platform-neutral Firebase backend. Implemented by
 *  - backend.native.ts → @react-native-firebase (real SMS OTP, native Google / Apple sign-in)
 *  - backend.web.ts    → Firebase JS SDK (popup sign-in, reCAPTCHA phone OTP)
 * When Firebase isn't configured, `ready` is false and the app runs in guest mode.
 */
export type Backend = {
  ready: boolean;
  supportsApple: boolean;
  onAuth(cb: (user: AppUser | null) => void): () => void;
  currentUser(): AppUser | null;
  signInGoogle(): Promise<void>;
  signInApple(): Promise<void>;
  /** phone in E.164, e.g. +919812345678 */
  startPhone(phone: string): Promise<void>;
  confirmPhone(code: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  getDoc(path: string): Promise<DocData | null>;
  setDoc(path: string, data: DocData, merge?: boolean): Promise<void>;
  deleteDoc(path: string): Promise<void>;
  listDocs(collectionPath: string, opts?: { orderBy?: string; desc?: boolean; limit?: number }): Promise<(DocData & { id: string })[]>;
  serverTime(): unknown;
};

export class AuthCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}
