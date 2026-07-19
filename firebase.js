// =============================================
// js/firebase.js — Firebase ES Module Config
// ICT Club Uganda - Firebase Integration
// =============================================
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a project called "ict-club-uganda"
// 3. Enable Realtime Database (start in test mode)
// 4. Enable Authentication → Email/Password
// 5. Replace the config object below with your
//    actual Firebase project credentials.
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
  child,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---- YOUR Firebase Config ----
// Replace these values with your actual project config
const firebaseConfig = {
  apiKey: "AIzaSyC2aOX7H8o1V_wHbHGAzu2EKBUSUoRH3-M",
  authDomain: "ict-club-buhobe.firebaseapp.com",
  databaseURL: "https://ict-club-buhobe-default-rtdb.firebaseio.com",
  projectId: "ict-club-buhobe",
  storageBucket: "ict-club-buhobe.firebasestorage.app",
  messagingSenderId: "565934126535",
  appId: "1:565934126535:web:33bdf81e59cf63722795e2"
};

// ---- Initialize Firebase ----
const app      = initializeApp(firebaseConfig);
const db       = getDatabase(app);
const auth     = getAuth(app);

// ---- Admin Email Whitelist ----
// Add authorised admin email addresses here
export const ADMIN_EMAILS = [
  "admin@gmail.com",
  "patron@gmail.com"
  // Add more as needed
];

// ---- Helper: Generate unique ID ----
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ---- Export Firebase services ----
export {
  app, db, auth,
  // Database
  ref, push, set, update, remove,
  onValue, get, child, query,
  orderByChild, limitToLast,
  // Auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
};

// ---- Database Reference Helpers ----
export const dbRefs = {
  lessons:  () => ref(db, 'lessons'),
  projects: () => ref(db, 'projects'),
  news:     () => ref(db, 'news'),
  events:   () => ref(db, 'events'),
  gallery:  () => ref(db, 'gallery'),
  feedback: () => ref(db, 'feedback'),
  users:    () => ref(db, 'users'),
  lesson:   (id) => ref(db, `lessons/${id}`),
  project:  (id) => ref(db, `projects/${id}`),
  newsItem: (id) => ref(db, `news/${id}`),
  event:    (id) => ref(db, `events/${id}`),
  image:    (id) => ref(db, `gallery/${id}`),
  fbItem:   (id) => ref(db, `feedback/${id}`),
  user:     (id) => ref(db, `users/${id}`)
};

// ---- Generic CRUD operations ----

/** Create: push new item to a collection */
export async function createItem(collectionRef, data) {
  const newRef = push(collectionRef);
  await set(newRef, { ...data, id: newRef.key, createdAt: Date.now() });
  return newRef.key;
}

/** Read all: returns a snapshot object */
export function readAll(collectionRef, callback) {
  return onValue(collectionRef, (snapshot) => {
    const data = snapshot.val();
    const items = data
      ? Object.entries(data).map(([key, val]) => ({ ...val, id: key }))
      : [];
    callback(items);
  });
}

/** Update: merge data into existing item */
export async function updateItem(itemRef, data) {
  await update(itemRef, { ...data, updatedAt: Date.now() });
}

/** Delete: remove item */
export async function deleteItem(itemRef) {
  await remove(itemRef);
}

/** Check if user is admin */
export function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}
