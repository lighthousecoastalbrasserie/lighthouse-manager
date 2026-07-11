import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type UserRole = "general_manager" | "agm" | "assistant_manager";

export interface ManagerProfile {
  uid: string;
  name: string;
  role: UserRole;
  pin: string;
  department?: string;
  active: boolean;
}

export async function signInWithPin(pin: string): Promise<ManagerProfile | null> {
  try {
    const email = `${pin}@lighthouse-manager.com`;
    const password = `lh_${pin}_secure`;
    const result = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getManagerProfile(result.user.uid);
    return profile;
  } catch (error) {
    console.error("Sign in error:", error);
    return null;
  }
}

export async function getManagerProfile(uid: string): Promise<ManagerProfile | null> {
  try {
    const docRef = doc(db, "managers", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ManagerProfile;
    }
    return null;
  } catch (error) {
    console.error("Get profile error:", error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
