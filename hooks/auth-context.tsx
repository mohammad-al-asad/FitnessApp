// Auth context for managing user authentication state and actions
import { auth } from "@/config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";


type AuthResult =
  | { success: true; user: User }
  | { success: false; error: { message: string } };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 Watch authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsInitialized(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

 // 🧹 Utility: Clear only temporary or cached Fitco data (preserves user data)
const clearFitcoData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    // ❗ Skip per-user data — only remove truly temporary/global keys
    const filtered = keys.filter(
      (k) =>
        !k.startsWith("fitco_daily_logs_") &&
        !k.startsWith("fitco_settings_") &&
        !k.startsWith("fitco_user_profile_") &&
        !k.startsWith("questionnaireData_") &&
        !k.startsWith("hasCompletedQuestionnaire_")
    );
    if (filtered.length > 0) {
      await AsyncStorage.multiRemove(filtered);
      console.log("🧼 Cleared Fitco data (safe):", filtered);
    }
  } catch (error) {
    console.error("Error clearing storage (safe):", error);
  }
};


  // ✅ Sign In
  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await clearFitcoData(); // ensure clean load per user
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error("[Auth] SignIn error:", error);
      return { success: false, error: { message: error.message } };
    }
  };

 // ✅ Sign Up
const signUp = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<AuthResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Give user a display name so Settings shows correctly
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });

    // ✅ Clear any global Fitco cache
    await clearFitcoData();

    // ✅ Create a blank profile for this specific user
    const blankProfile = {
  userId: userCredential.user.uid,
  firstName,
  lastName,
  email,
  weight: 70,
  height: 170,
  goal: "maintain_weight",
  activityLevel: "moderately_active",
  // ❌ remove targetCalories/Protein/Carbs/Fat here
};


  // ✅ Only initialize if not already existing
const existingProfile = await AsyncStorage.getItem(`fitco_user_profile_${user.uid}`);
if (!existingProfile) {
  await AsyncStorage.setItem(`fitco_user_profile_${user.uid}`, JSON.stringify(blankProfile));
}

const existingSettings = await AsyncStorage.getItem(`fitco_settings_${user.uid}`);
if (!existingSettings) {
  await AsyncStorage.setItem(`fitco_settings_${user.uid}`, JSON.stringify({}));
}

const existingLogs = await AsyncStorage.getItem(`fitco_daily_logs_${user.uid}`);
if (!existingLogs) {
  await AsyncStorage.setItem(`fitco_daily_logs_${user.uid}`, JSON.stringify({}));
}


    console.log("✅ New user created:", user.uid, user.displayName);
    setUser(user);

    return { success: true, user };
  } catch (error: any) {
    console.error("[Auth] SignUp error:", error);
    return { success: false, error: { message: error.message } };
  }
};


  // ✅ Safe Logout (preserves user data)
const logout = async (): Promise<void> => {
  try {
    await signOut(auth);

    // Only clear temporary or cached data — not user logs/settings
    const keys = await AsyncStorage.getAllKeys();
    const filtered = keys.filter(
      (key) =>
        !key.startsWith("fitco_daily_logs_") &&
        !key.startsWith("fitco_settings_") &&
        !key.startsWith("questionnaireData_") &&
        !key.startsWith("fitco_user_profile_") &&
        !key.startsWith("hasCompletedQuestionnaire_")
    );
    await AsyncStorage.multiRemove(filtered);
    console.log("🧼 Cleared Fitco data (safe):", filtered);

    router.replace("/(auth)");
  } catch (error: any) {
    console.error("[Auth] Logout error:", error);
  }
};

// ✅ Context provider
return (
  <AuthContext.Provider
    value={{ user, loading, isInitialized, signIn, signUp, logout }}
  >
    {children}
  </AuthContext.Provider>
);
};

// ✅ Hook for accessing Auth context
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
