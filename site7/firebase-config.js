// Firebase Configuration — Iron Foundry Sect
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_5Lzy7w_r8_018F_j6qxbXa5GIj9Twpk",
  authDomain: "ironfoundrysect.firebaseapp.com",
  projectId: "ironfoundrysect",
  storageBucket: "ironfoundrysect.firebasestorage.app",
  messagingSenderId: "183565240555",
  appId: "1:183565240555:web:2d114a5352747e3cdd56ae",
  measurementId: "G-C6H8TV5LX4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
