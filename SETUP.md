# Project Setup on a New Laptop

---

## Prerequisites — Install these first

| Tool | Version | Download |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| Python | 3.11 | https://python.org/downloads |
| Git | latest | https://git-scm.com |
| JDK | 17 | https://adoptium.net (for APK builds only) |
| Android Studio | latest | https://developer.android.com/studio (for APK builds only) |

> For **just running the backend locally**, you only need Node.js, Python 3.11, and Git.
> JDK + Android Studio are only needed if you want to build the APK.

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd FakeEngagementApp
```

---

## Step 2 — Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` file (copy these and fill in your values):

```
PORT=5000
MONGO_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=fakeengagedetect
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@fakeengagedetect.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ML_TIMEOUT_MS=30000
PYTHON_BIN=python
```

> `PYTHON_BIN=python` uses your system Python 3.11 directly.
> On some machines it might be `python3` — adjust if needed.

---

## Step 3 — ML module setup

```bash
cd ..
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```

Update `backend/.env` to point to the venv:

```
PYTHON_BIN=venv\Scripts\python.exe
```

> Use forward slashes on Mac/Linux: `venv/bin/python`

---

## Step 4 — Run the backend locally

```bash
cd backend
node src/server.js
```
``
You should see:
```
✅ MongoDB connected
🚀 Server running on port 5000
```

---

## Step 5 — Mobile App setup (for development)

```bash
cd MobileApp
npm install
```

**If running against local backend** (not Render), update `MobileApp/src/api/config.ts`:
```ts
export const BASE_URL = 'http://YOUR_LAPTOP_IP:5000/api';
// Find your IP: run ipconfig → look for IPv4 Address
```

**If using the deployed Render backend** (recommended), no change needed — it already points to:
```ts
export const BASE_URL = 'https://fake-engage-detect-1.onrender.com/api';
```

Run the app on a connected phone (USB debugging on):
```bash
cd MobileApp
npm start          # starts Metro bundler (keep this running)
# in a new terminal:
npx react-native run-android
`````

---

## Step 6 — Build APK (to install on any phone)

```bash
cd MobileApp\android
gradlew assembleRelease
```

APK: `MobileApp\android\app\build\outputs\apk\release\app-release.apk`

---

## Quick reference

| What | Command | Directory |
|---|---|---|
| Start backend | `node src/server.js` | `backend/` |
| Start mobile dev | `npm start` | `MobileApp/` |
| Build APK | `gradlew assembleRelease` | `MobileApp/android/` |
| Activate venv | `venv\Scripts\activate` | project root |
