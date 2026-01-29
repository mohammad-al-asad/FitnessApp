import { getApp, getApps, initializeApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence 
} from "firebase/auth"; // Import these
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDiztgwwQ_psDxCkXnWYkoRwxChMllpYdQ",
  authDomain: "fitcov3.firebaseapp.com",
  projectId: "fitcov3",
  storageBucket: "fitcov3.firebasestorage.app",
  messagingSenderId: "810557653619",
  appId: "1:810557653619:web:9a4d2614395f38c3576006",
  measurementId: "G-9P4D2RWT9P",
};

// Initialize App
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with Persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { app, auth, db };