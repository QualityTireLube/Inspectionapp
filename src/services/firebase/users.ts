/**
 * Firebase user management — Firestore `users` collection.
 * Replaces legacy /users, /profile, /roles endpoints from api.ts.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, where
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

// ── Roles (simplified — stored as `role` field on user docs) ──────────────────

export type UserRole = {
  id: string;
  name: string;
  homePageId?: string;
  pages?: string[];
};

const ROLE_PRESETS: UserRole[] = [
  { id: 'admin',           name: 'Admin',           homePageId: 'home' },
  { id: 'manager',         name: 'Manager',         homePageId: 'home' },
  { id: 'service_advisor', name: 'Service Advisor', homePageId: 'home' },
  { id: 'technician',      name: 'Technician',      homePageId: 'quickCheck' },
];

export async function getRoles(): Promise<UserRole[]> {
  return ROLE_PRESETS;
}

/**
 * Returns the React Router path for a role's home page.
 * Falls back to '/' if the role or its homePageId is not found.
 */
export function getRoleHomePath(roleId: string): string {
  const role = ROLE_PRESETS.find(r => r.id === roleId);
  if (!role?.homePageId) return '/';
  // Lazy import avoided here — use a local lookup instead of importing appPages
  // to keep this synchronous and avoid circular dependencies.
  const homePathMap: Record<string, string> = {
    home:        '/',
    quickCheck:  '/quick-check',
    techDashboard: '/tech-dashboard',
    noCheck:     '/no-check',
    vsi:         '/vsi',
    settings:    '/settings',
  };
  return homePathMap[role.homePageId] ?? '/';
}

const ROLE_CONFIGS = 'roleConfigs';

/**
 * Load the page-access config for a single role from Firestore.
 * Falls back to the default page list from pageRegistry if no Firestore doc exists.
 */
export async function getRoleConfig(roleId: string): Promise<string[]> {
  const { DEFAULT_ROLE_PAGES } = await import('../../pages/pageRegistry');
  try {
    const snap = await getDoc(doc(db, ROLE_CONFIGS, roleId));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.pages)) return data.pages as string[];
    }
  } catch {
    // Firestore unavailable — fall through to defaults
  }
  return DEFAULT_ROLE_PAGES[roleId] ?? [];
}

/**
 * Persist the allowed page list for a role to Firestore.
 */
export async function saveRoleConfig(roleId: string, pages: string[]): Promise<void> {
  await setDoc(doc(db, ROLE_CONFIGS, roleId), { roleId, pages }, { merge: true });
}

/**
 * Load page configs for all known roles.
 */
export async function getAllRoleConfigs(): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  await Promise.all(
    ROLE_PRESETS.map(async (role) => {
      result[role.id] = await getRoleConfig(role.id);
    })
  );
  return result;
}

/** @deprecated Use getRoleConfig / saveRoleConfig instead */
export async function getRolePages(): Promise<{ roleId: string; pages: string[] }[]> {
  return [];
}
