# QuickCheck Firebase - Vehicle Inspection App

> **ACTION REQUIRED — Project Owner**
>
> Firebase Storage has not been activated on this project yet. A project owner or admin with billing permissions must complete this one-time step:
>
> 1. Go to [Firebase Console → Storage](https://console.firebase.google.com/project/inspectionapp-b9a42/storage)
> 2. Click **Get Started** and follow the prompts
> 3. Once activated, run from the repo root:
>    ```bash
>    firebase deploy --only storage
>    ```
>
> Image uploads (inspection photos, draft images) will not work until this is done.

A modern, Firebase-based Progressive Web Application (PWA) for automotive service businesses. Provides complete inspection workflows with real-time sync, cloud storage, and minimal backend dependencies.

## 🏗️ Architecture

### Overview
This app uses a **hybrid architecture** combining Firebase services with a minimal Express backend:

- **Frontend**: React 18 + TypeScript, Material-UI v7, Vite
- **Database**: Cloud Firestore (replaces SQLite)
- **Authentication**: Firebase Auth (replaces JWT)
- **Storage**: Firebase Storage (replaces local file system)
- **Real-time**: Firestore listeners (replaces WebSocket)
- **Backend**: Minimal Express server (VIN decoding only)

### Key Features
- ✅ **QuickCheck, NoCheck, and VSI** inspection workflows
- ✅ **Real-time draft auto-save** with Firestore
- ✅ **Cloud image storage** with Firebase Storage
- ✅ **Multi-device sync** - work on any device
- ✅ **Offline support** - Firebase SDK handles offline mode
- ✅ **Sticker & Label printing** (same as original app)
- ✅ **Dynamic inspection schemas** - configure inspections without code changes

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           React Frontend (Vite)             │
│  Pages: Home, QuickCheck, NoCheck, VSI      │
│  Components: InspectionLayout, Tabs         │
└────────────┬────────────────────────────────┘
             │
             ├─────────────┬─────────────┬────────────┐
             ▼             ▼             ▼            ▼
    ┌────────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
    │  Firebase  │  │Firestore │  │Firebase │  │ Express  │
    │    Auth    │  │ Database │  │ Storage │  │(VIN only)│
    └────────────┘  └──────────┘  └─────────┘  └──────────┘
                                                      │
                                                      ▼
                                                 NHTSA API
```

## 📦 Project Structure

```
QuickcheckFirebase/
├── src/                          # Frontend source
│   ├── pages/                    # React pages
│   │   ├── Home.tsx             # Main dashboard
│   │   ├── QuickCheck.tsx       # Quick inspection
│   │   ├── NoCheck.tsx          # No check workflow
│   │   ├── VSI.tsx              # Vehicle Safety Inspection
│   │   └── InspectionPage.tsx   # Shared inspection engine
│   ├── components/              # React components
│   ├── services/
│   │   └── firebase/            # Firebase service layer
│   │       ├── config.ts        # Firebase initialization
│   │       ├── auth.ts          # Authentication
│   │       ├── inspections.ts   # CRUD operations
│   │       ├── drafts.ts        # Auto-save system
│   │       ├── storage.ts       # Image uploads
│   │       └── realtime.ts      # Real-time listeners
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript types
│   └── config/                  # App configuration
├── server/                      # Minimal Express backend
│   ├── minimal-index.js         # VIN decoder (~100 lines)
│   ├── logger.js                # Winston logger
│   └── package.json             # Server dependencies
├── public/                      # Static assets
├── firebase.json                # Firebase configuration
├── firestore.rules              # Database security rules
├── storage.rules                # Storage security rules
├── package.json                 # Root dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
└── .env.example                # Environment template
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase account ([create one free](https://firebase.google.com/))
- Firebase CLI: `npm install -g firebase-tools`

### 1. Clone and Install

```bash
cd ~/QuickcheckFirebase
npm install
cd server && npm install && cd ..
```

### 2. Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Enable Google Analytics (optional)

2. **Enable Firebase Services**
   ```
   Authentication > Get Started > Email/Password > Enable
   Firestore Database > Create Database > Start in production mode
   Storage > Get Started > Start in production mode
   ```

3. **Get Firebase Config**
   - Project Settings > General > Your apps
   - Click "Web app" icon (</>) to add a web app
   - Copy the firebaseConfig object

4. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and paste your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

5. **Deploy Firebase Rules**
   ```bash
   firebase login
   firebase init  # Select Firestore and Storage
   firebase deploy --only firestore:rules,storage:rules
   ```

### 3. Run Development Servers

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev:frontend  # Frontend at https://localhost:3000
npm run dev:backend   # Backend at http://localhost:5001
```

### 4. Create First User

1. Open https://localhost:3000
2. Click "Register"
3. Create account with email/password
4. Start using the app!

## 📚 Key Differences from Original App

| Feature | Original App | Firebase App |
|---------|-------------|--------------|
| Database | SQLite (local) | Cloud Firestore |
| Auth | JWT + bcrypt | Firebase Auth |
| Images | Express static files | Firebase Storage |
| Real-time | WebSocket | Firestore listeners |
| Backend | 6,500+ lines | ~100 lines |
| Offline | Limited | Full offline support |
| Multi-device | No | Yes, real-time sync |
| Deployment | Complex | Simple (Firebase Hosting) |

## 🔧 Common Tasks

### Run Tests
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy
```

### View Firebase Data
```bash
# Open Firestore console
firebase open firestore

# Open Storage console
firebase open storage
```

## 📖 API Documentation

### Firebase Services

#### Authentication (`src/services/firebase/auth.ts`)
```typescript
import { loginUser, registerUser, logoutUser } from './services/firebase';

// Register
await registerUser(email, password);

// Login
await loginUser(email, password);

// Logout
await logoutUser();
```

#### Inspections (`src/services/firebase/inspections.ts`)
```typescript
import { createInspection, getInspectionsByUser } from './services/firebase';

// Create inspection
const id = await createInspection({
  userId: user.uid,
  userName: user.email,
  inspectionType: 'quick_check',
  data: formData,
  status: 'submitted'
});

// Get user's inspections
const inspections = await getInspectionsByUser(userId, 'quick_check');
```

#### Drafts (`src/services/firebase/drafts.ts`)
```typescript
import { saveDraft, loadDraft, subscribeToDraft } from './services/firebase';

// Auto-save draft
await saveDraft(userId, userName, 'quick_check', formData);

// Load draft
const draft = await loadDraft(userId, 'quick_check');

// Real-time draft sync
const unsubscribe = subscribeToDraft(userId, 'quick_check', (draft) => {
  console.log('Draft updated:', draft);
});
```

#### Storage (`src/services/firebase/storage.ts`)
```typescript
import { uploadInspectionImage } from './services/firebase';

// Upload image
const result = await uploadInspectionImage(
  file, 
  'quick_check', 
  inspectionId, 
  'dash_lights'
);

console.log('Image URL:', result.url);
```

### Minimal Express Endpoint

**VIN Decoding**: `GET http://localhost:5001/api/vin/decode/:vin`

```bash
curl http://localhost:5001/api/vin/decode/1HGBH41JXMN109186
```

Response:
```json
{
  "Results": [
    { "Variable": "Make", "Value": "HONDA" },
    { "Variable": "Model", "Value": "Accord" },
    ...
  ]
}
```

## 🔐 Security

### Firestore Rules
All data is protected by security rules in `firestore.rules`:
- Users can only read/write their own inspections
- Users can only access their own drafts
- Schemas and field registry are read-only

### Storage Rules
Images are protected in `storage.rules`:
- Users can only upload images they own
- Max 10MB per image
- Only image files allowed

## 🎨 Customization

### Add New Inspection Type

1. Update `src/config/inspectionSchemas.ts`:
```typescript
export const INSPECTION_SCHEMAS = {
  ...
  safety_check: {
    title: 'Safety Check',
    tabOrder: ['info', 'brakes', 'lights'],
    fieldsByTab: { ... },
    submitType: 'safety_check'
  }
}
```

2. Create route in `src/App.tsx`:
```typescript
<Route path="/safety-check" element={<SafetyCheck />} />
```

3. No backend changes needed!

## 🐛 Troubleshooting

### Firebase Connection Issues
```bash
# Check Firebase status
firebase projects:list

# Re-login
firebase login --reauth
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### VIN Decoder Not Working
Check server logs:
```bash
cd server
npm run dev
# Check logs in server/server.log
```

## 📞 Support

- **Firebase Issues**: [Firebase Support](https://firebase.google.com/support)
- **React Issues**: Check browser console for errors
- **VIN Decoder**: NHTSA API must be accessible

## 🎯 Next Steps

After setup, consider:
1. Customize inspection schemas for your business
2. Add custom fields to field registry
3. Configure print templates for stickers/labels
4. Set up backup/export for Firestore data
5. Enable Firebase Analytics for usage insights

## 📄 License

Proprietary. All rights reserved.

---

Built with ❤️ using Firebase, React, and TypeScript
