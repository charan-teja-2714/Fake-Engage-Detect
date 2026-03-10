# Deployment Guide

---

## Overview

| Component | Local | Deployed |
|---|---|---|
| Backend (Node.js) | `localhost:5000` | Render URL |
| ML Module (Python) | `venv/Scripts/python.exe` | `python3` on Render |
| Database (MongoDB) | Atlas cloud | Same Atlas (no change) |
| Firebase Auth | Same project | Same project (no change) |
| Mobile App | APK connecting to local IP | APK connecting to Render URL |

> ⚠️ **Render free tier sleeps after 15 min inactivity.** Cold start takes ~50 seconds.
> Before a demo, open the test URL in your browser to wake the server first.

---

## Step 1 — Push code to GitHub

Render deploys from GitHub. Push the **entire project root** (not just `backend/`):

```bash
cd "I:\Final Year Projects\FakeEngagementApp"
git init
git add .
git commit -m "initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

> ⚠️ Make sure `ml-module/saved_models/` and `dataset/processed/` are **not** in `.gitignore` — Render needs these files to run predictions.

---

## Step 2 — Code already done (no further changes needed)

These were already updated in a previous session:

| File | Change | Status |
|---|---|---|
| `backend/src/services/ml.service.js` line 43 | `PYTHON_BIN = process.env.PYTHON_BIN \|\| "python3"` | ✅ Done |
| `backend/requirements.txt` | Python ML dependencies | ✅ Done |
| `nixpacks.toml` (project root) | Build config | ✅ Done (not used by Render, ignore it) |

---

## Step 3 — Create Render Web Service

1. Go to [render.com](https://render.com) → sign up with GitHub (free, no credit card)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:

| Setting | Value |
|---|---|
| **Name** | `fakeengage-backend` |
| **Root Directory** | *(leave blank)* |
| **Runtime** | `Node` |
| **Build Command** | `pip install -r backend/requirements.txt && cd backend && npm install` |
| **Start Command** | `node backend/src/server.js` |
| **Instance Type** | Free |

5. Click **Advanced** → **Add Environment Variable** → add all of these:

```
PORT=5000
MONGO_URI=mongodb+srv://fakeengage_db_user:...@ac-hrhuuhl...
FIREBASE_PROJECT_ID=fakeengagedetect
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@fakeengagedetect.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
ML_TIMEOUT_MS=30000
```

> ⚠️ `FIREBASE_PRIVATE_KEY` — paste exactly as it appears in your `.env` file (with `\n` as literal text, **not** line breaks).

6. Click **Create Web Service** — Render builds and deploys automatically.

Your URL will be: `https://fakeengage-backend.onrender.com`

---

## Step 4 — Update Mobile App Config

**`MobileApp/src/api/config.ts` — line 15**

Change:
```ts
export const BASE_URL = 'http://10.212.36.55:5000/api';
```
To:
```ts
export const BASE_URL = 'https://fakeengage-backend.onrender.com/api';
```

*(Use your actual Render URL from Step 3)*

---

## Step 5 — Build APK

### 5.1 Generate release keystore (one time only)
```bash
cd MobileApp/android
keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
```
Remember the password you set.

### 5.2 Add keystore config

In `MobileApp/android/gradle.properties`, add:
```
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=release
MYAPP_RELEASE_STORE_PASSWORD=YOUR_PASSWORD
MYAPP_RELEASE_KEY_PASSWORD=YOUR_PASSWORD
```

In `MobileApp/android/app/build.gradle`, update `signingConfigs.release`:
```gradle
release {
    storeFile file(MYAPP_RELEASE_STORE_FILE)
    storePassword MYAPP_RELEASE_STORE_PASSWORD
    keyAlias MYAPP_RELEASE_KEY_ALIAS
    keyPassword MYAPP_RELEASE_KEY_PASSWORD
}
```
And set `buildTypes.release.signingConfig signingConfigs.release`.

### 5.3 Build the APK
```bash
cd MobileApp/android
./gradlew assembleRelease
```

APK location: `MobileApp/android/app/build/outputs/apk/release/app-release.apk`

---

## Step 6 — Do you need to keep anything running?

| Service | Keep running? | Notes |
|---|---|---|
| Render backend | Auto (Render manages it) | Sleeps on free tier — wake before demo |
| MongoDB Atlas | Auto (cloud) | Nothing to manage |
| Firebase | Auto (cloud) | Nothing to manage |
| ML Module | Runs inside backend process | No separate service needed |
| Metro bundler | ❌ No | Only needed during development |
| Your laptop | ❌ No | Not needed after deployment |

---

## Quick test after deployment

Open browser → `https://fakeengage-backend.onrender.com/api/auth/me`

Expected response: `{"success":false,"error":"Authorization token missing"}`

If you see that → backend is live and working.
