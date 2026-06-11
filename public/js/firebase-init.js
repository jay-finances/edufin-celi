// firebase-init.js — Configuration Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZAQVYs8wHbjesRTi6gLIs2T-WuO1thrQ",
  authDomain: "edufin-esrdl-jlebel.firebaseapp.com",
  projectId: "edufin-esrdl-jlebel",
  storageBucket: "edufin-esrdl-jlebel.firebasestorage.app",
  messagingSenderId: "552776604512",
  appId: "1:552776604512:web:d7614baaa70ab445ee5c05"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
