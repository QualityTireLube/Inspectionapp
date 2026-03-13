# QuickCheck Firebase - Getting Started

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd ~/QuickcheckFirebase
npm install
cd server && npm install && cd ..
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable these services:
   - **Authentication** → Email/Password
   - **Firestore Database** → Production mode
   - **Storage** → Production mode

4. Get your config:
   - Project Settings → General → Web app
   - Copy the config values

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials.

### 4. Deploy Security Rules

```bash
firebase login
firebase init
# Select: Firestore, Storage
# Use existing files when prompted

firebase deploy --only firestore:rules,storage:rules
```

### 5. Run the App

```bash
npm run dev
```

Open: https://localhost:3000

### 6. Create First User

1. Click "Register"
2. Create account
3. Start inspecting!

## What's Different?

- ✅ **No SQLite database** - Everything in the cloud
- ✅ **No complex backend** - Just VIN decoding
- ✅ **Real-time sync** - Changes appear instantly
- ✅ **Offline support** - Works without internet
- ✅ **Multi-device** - Start on phone, finish on tablet

## Need Help?

Check the main [README.md](./README.md) for detailed documentation.
