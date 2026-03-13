/**
 * One-time setup script — creates the admin user in Firebase Auth + Firestore.
 * Run with:  node scripts/setup-admin.mjs
 *
 * Prerequisites:
 *   1. Email/Password sign-in enabled in Firebase Console → Authentication → Sign-in method
 *   2. Firestore database created in Firebase Console → Firestore Database → Create database
 */

const API_KEY       = 'AIzaSyBiDX4q8XSSUFVsCIgB9kfDH4aWN7ttdpU';
const PROJECT_ID    = 'inspectionapp-b9a42';
const ADMIN_EMAIL   = 'a@a.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME    = 'Admin';

const AUTH_BASE  = `https://identitytoolkit.googleapis.com/v1`;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json));
  return json;
}

async function patchFirestore(url, body, token) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json));
  return json;
}

// ── Step 1: Create Auth user ───────────────────────────────────────────────
console.log('\n📧  Creating Firebase Auth user...');
let uid, idToken;
try {
  const signup = await post(
    `${AUTH_BASE}/accounts:signUp?key=${API_KEY}`,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }
  );
  uid     = signup.localId;
  idToken = signup.idToken;
  console.log(`✅  Auth user created  uid=${uid}`);
} catch (err) {
  if (err.message.includes('EMAIL_EXISTS')) {
    // User already exists — sign in instead
    console.log('⚠️   User already exists, signing in...');
    const signin = await post(
      `${AUTH_BASE}/accounts:signInWithPassword?key=${API_KEY}`,
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }
    );
    uid     = signin.localId;
    idToken = signin.idToken;
    console.log(`✅  Signed in  uid=${uid}`);
  } else {
    console.error('❌  Auth error:', err.message);
    process.exit(1);
  }
}

// ── Step 2: Update display name ────────────────────────────────────────────
console.log('\n✏️   Setting display name...');
try {
  await post(
    `${AUTH_BASE}/accounts:update?key=${API_KEY}`,
    { idToken, displayName: ADMIN_NAME, returnSecureToken: false }
  );
  console.log('✅  Display name set to:', ADMIN_NAME);
} catch (err) {
  console.warn('⚠️   Could not set display name:', err.message);
}

// ── Step 3: Write Firestore user document ─────────────────────────────────
console.log('\n🗄️   Writing user profile to Firestore...');
const now = new Date().toISOString();
const userDoc = {
  fields: {
    uid:       { stringValue: uid },
    email:     { stringValue: ADMIN_EMAIL },
    name:      { stringValue: ADMIN_NAME },
    role:      { stringValue: 'admin' },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  }
};

try {
  await patchFirestore(`${FS_BASE}/users/${uid}`, userDoc, idToken);
  console.log('✅  Firestore user document created at users/' + uid);
} catch (err) {
  console.error('❌  Firestore error:', err.message);
  console.log('\n👆  This usually means the Firestore database has not been created yet.');
  console.log('    Go to: https://console.firebase.google.com/project/inspectionapp-b9a42/firestore');
  console.log('    Click "Create database" → Start in test mode → Done');
  console.log('    Then re-run this script.\n');
  process.exit(1);
}

console.log('\n🎉  Setup complete!');
console.log('────────────────────────────────');
console.log('  Email   :', ADMIN_EMAIL);
console.log('  Password:', ADMIN_PASSWORD);
console.log('  Role    : admin');
console.log('  UID     :', uid);
console.log('────────────────────────────────');
console.log('You can now log in at http://localhost:5173\n');
