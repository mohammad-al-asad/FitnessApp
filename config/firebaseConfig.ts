import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiztgwwQ_psDxCkXnWYkoRwxChMllpYdQ",
  authDomain: "fitcov3.firebaseapp.com",
  projectId: "fitcov3",
  storageBucket: "fitcov3.firebasestorage.app",
  messagingSenderId: "810557653619",
  appId: "1:810557653619:web:9a4d2614395f38c3576006",
  measurementId: "G-9P4D2RWT9P",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

