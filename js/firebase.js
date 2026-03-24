// ── Firebase configuration ────────────────────────────────────
// Replace these values with your Firebase project config
// (Firebase Console → Project Settings → Your apps → SDK setup)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyAieipC56lP3efN4JVYQJdakNace5SXODc",
  authDomain: "juodziaibooks.firebaseapp.com",
  projectId: "juodziaibooks",
  storageBucket: "juodziaibooks.firebasestorage.app",
  messagingSenderId: "779105791312",
  appId: "1:779105791312:web:c8515eb8e4024f16f19055",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  db,
  auth,
  googleProvider,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};
