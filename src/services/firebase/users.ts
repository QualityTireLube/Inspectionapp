/**
 * Firebase user management — Firestore `users` collection.
 * Replaces legacy /users, /profile, /roles endpoints from api.ts.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, where, writeBatch
} from 'firebase/firestore';
import { updateEmail, updatePassword as fbUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from './config';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  pin?: string;
  location?: string;
  enabled?: boolean;
  createdAt?: string;
}

const USERS = 'users';

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid?: string): Promise<UserProfile | null> {
  const id = uid ?? auth.currentUser?.uid;
  if (!id) return null;
  const snap = await getDoc(doc(db, USERS, id));
  if (!snap.exists()) return null;
  return { uid: id, ...snap.data() } as UserProfile;
}

export async function getUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, USERS), orderBy('email')));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function updateProfile(
  name: string,
  email: string,
  pin?: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated — please refresh and try again');
  const updates: Partial<UserProfile> = { name, email };
  if (pin !== undefined) updates.pin = pin;
  // setDoc merge handles the case where the doc was never created via Firestore
  await setDoc(doc(db, USERS, uid), updates as any, { merge: true });
  if (name) localStorage.setItem('userName', name);
  if (email) localStorage.setItem('userEmail', email);
}

/** Update only the PIN without touching name/email. */
export async function updatePin(pin: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated — please refresh and try again');
  await setDoc(doc(db, USERS, uid), { pin }, { merge: true });
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not authenticated');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await fbUpdatePassword(user, newPassword);
}

export async function updateUserRole(uid: string, role: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { role });
}

export async function updateUserLocation(uid: string, location: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { location });
}

export async function updateUserDetails(uid: string, updates: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, USERS, uid), updates as any);
}

export async function enableUser(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { enabled: true });
}

export async function disableUser(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { enabled: false });
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS, uid));
}

export async function lookupUserByPin(pin: string): Promise<UserProfile | null> {
  const all = await getUsers();
  return all.find(u => u.pin === pin) ?? null;
}

// ── User Settings (stored as a field on the user doc) ─────────────────────────

export async function getUserSettings(): Promise<Record<string, any>> {
  const uid = auth.currentUser?.uid;
  if (!uid) return {};
  const snap = await getDoc(doc(db, USERS, uid));
  return (snap.data()?.settings as Record<string, any>) ?? {};
}

export async function updateUserSettings(settings: Record<string, any>): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await updateDoc(doc(db, USERS, uid), { settings });
}

// ── Roles — stored in Firestore `roles` collection ────────────────────────────

export type UserRole = {
  id: string;
  name: string;
  homePageId?: string;
  visiblePages?: string[]; // empty = all pages visible
  pages?: string[];        // legacy alias
};

const ROLES_COLLECTION = 'roles';

const DEFAULT_ROLES: UserRole[] = [
  { id: 'admin',           name: 'Admin',           homePageId: 'home',       visiblePages: [] },
  { id: 'manager',         name: 'Manager',         homePageId: 'home',       visiblePages: [] },
  { id: 'service_advisor', name: 'Service Advisor', homePageId: 'home',       visiblePages: [] },
  { id: 'technician',      name: 'Technician',      homePageId: 'quickCheck', visiblePages: ['techDashboard', 'quickCheck', 'noCheck', 'vsi'] },
];

/** Seed default roles if collection is empty. */
export async function seedDefaultRolesIfEmpty(): Promise<void> {
  const snap = await getDocs(collection(db, ROLES_COLLECTION));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  DEFAULT_ROLES.forEach(role => {
    batch.set(doc(db, ROLES_COLLECTION, role.id), {
      name: role.name,
      homePageId: role.homePageId ?? 'home',
      visiblePages: role.visiblePages ?? [],
    });
  });
  await batch.commit();
}

export async function getRoles(): Promise<UserRole[]> {
  try {
    const snap = await getDocs(collection(db, ROLES_COLLECTION));
    if (snap.empty) {
      await seedDefaultRolesIfEmpty();
      return DEFAULT_ROLES;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRole));
  } catch {
    return DEFAULT_ROLES;
  }
}

export async function getRoleById(roleId: string): Promise<UserRole | null> {
  try {
    const snap = await getDoc(doc(db, ROLES_COLLECTION, roleId));
    if (!snap.exists()) {
      return DEFAULT_ROLES.find(r => r.id === roleId) ?? null;
    }
    return { id: snap.id, ...snap.data() } as UserRole;
  } catch {
    return DEFAULT_ROLES.find(r => r.id === roleId) ?? null;
  }
}

export async function updateRole(roleId: string, updates: Partial<UserRole>): Promise<void> {
  const { id: _id, ...data } = updates as any;
  await setDoc(doc(db, ROLES_COLLECTION, roleId), data, { merge: true });
}

export async function getRolePages(): Promise<string[]> {
  return [];
}
