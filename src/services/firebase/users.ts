/**
 * Firebase user management — Firestore `users` collection.
 * Replaces legacy /users, /profile, /roles endpoints from api.ts.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy
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
  if (!uid) throw new Error('Not authenticated');
  const updates: Partial<UserProfile> = { name, email };
  if (pin !== undefined) updates.pin = pin;
  await updateDoc(doc(db, USERS, uid), updates as any);
  localStorage.setItem('userName', name);
  localStorage.setItem('userEmail', email);
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
  { id: 'admin', name: 'Admin', homePageId: 'home' },
  { id: 'manager', name: 'Manager', homePageId: 'home' },
  { id: 'service_advisor', name: 'Service Advisor', homePageId: 'home' },
  { id: 'technician', name: 'Technician', homePageId: 'quickCheck' },
];

export async function getRoles(): Promise<UserRole[]> {
  return ROLE_PRESETS;
}

export async function getRolePages(): Promise<{ roleId: string; pages: string[] }[]> {
  return [];
}
