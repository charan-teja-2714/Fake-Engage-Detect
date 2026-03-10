// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────────────────────
//
// SETUP INSTRUCTIONS:
//   1. Replace YOUR_MACHINE_IP with your computer's local IP address.
//      Find it with:  Windows → ipconfig  |  Mac/Linux → ifconfig
//      Example: 192.168.1.42
//
//   2. Replace YOUR_FIREBASE_WEB_API_KEY with the Web API Key from:
//      Firebase Console → Project Settings → General → Web API Key
//
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_URL = 'https://fake-engage-detect-1.onrender.com/api';

// Firebase Web API Key (from Firebase Console → Project Settings → General)
export const FIREBASE_API_KEY = 'AIzaSyAWAdWkCnVr84Pv_tlN-NF-qV2gRY1sf1A';

// Firebase REST auth endpoints
export const FIREBASE_SIGNUP_URL =
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
export const FIREBASE_LOGIN_URL =
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
