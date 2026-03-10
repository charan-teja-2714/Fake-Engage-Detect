# Deployment Guide

---

## Overview

| Component | Local | Deployed |
|---|---|---|
| Backend (Node.js) | `localhost:5000` | Render URL |
| ML Module (Python) | `venv/Scripts/python.exe` | `python3` inside Docker |
| Database (MongoDB) | Atlas cloud | Same Atlas (no change) |
| Firebase Auth | Same project | Same project (no change) |
| Mobile App | APK connecting to local IP | APK connecting to Render URL |

> ⚠️ **Render free tier sleeps after 15 min inactivity.** Cold start takes ~50 seconds.
> Before a demo, open the test URL in your browser to wake the server first.

---

## Step 1 — Push code to GitHub

```bash
cd "I:\Final Year Projects\FakeEngagementApp"
git add .
git commit -m "Add Docker deployment config"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2 — Code changes already done

| File | Change | Status |
|---|---|---|
| `backend/src/services/ml.service.js` line 43 | `PYTHON_BIN = process.env.PYTHON_BIN \|\| "python3"` | ✅ Done |
| `backend/requirements.txt` | Python ML dependencies | ✅ Done |
| `Dockerfile` (project root) | Docker build config | ✅ Done |
| `.dockerignore` (project root) | Excludes venv, raw dataset, MobileApp | ✅ Done |

---

## Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) → sign up with GitHub (free, no credit card)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:

| Setting | Value |
|---|---|
| **Name** | `fakeengage-backend` |
| **Root Directory** | *(leave blank)* |
| **Runtime** | **Docker** |
| **Instance Type** | Free |

> Render auto-detects the `Dockerfile` at the project root. No build/start command needed.

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

6. Click **Create Web Service** — Render builds the Docker image and deploys (~5 min first time).

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

*(Use your actual Render URL)*

---

## Step 5 — Build APK

### 5.1 Generate release keystore (one time only)
```bash
cd MobileApp/android
keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
```

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

APK: `MobileApp/android/app/build/outputs/apk/release/app-release.apk`

---

## Step 6 — Do you need to keep anything running?

| Service | Keep running? | Notes |
|---|---|---|
| Render backend | Auto (Docker container) | Sleeps on free tier — wake before demo |
| MongoDB Atlas | Auto (cloud) | Nothing to manage |
| Firebase | Auto (cloud) | Nothing to manage |
| ML Module | Runs inside Docker | No separate service needed |
| Metro bundler | ❌ No | Only needed during development |
| Your laptop | ❌ No | Not needed after deployment |

---

## Quick test after deployment

Open browser → `https://fakeengage-backend.onrender.com/api/auth/me`

Expected: `{"success":false,"error":"Authorization token missing"}`

If yes → live and working.
