import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  type BackendUser,
  backendLogout,
  backendMe,
  backendSignIn,
  backendSignUp,
  readStoredSession,
} from "@/services/backend-auth";

const USER_STORAGE_KEY = "fitco_auth_user";

type AuthResult =
  | { success: true; user: BackendUser }
  | { success: false; error: { message: string } };

type AuthContextType = {
  user: BackendUser | null;
  loading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearFitcoData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const removableKeys = [
        "cachedFoodDatabase",
        "fitco_food_cache",
        "testKey",
        "hasCompletedQuestionnaire",
      ];
      const removable = keys.filter((k) => removableKeys.includes(k));
      if (removable.length > 0) {
        await AsyncStorage.multiRemove(removable);
      }
    } catch (error) {
      console.error("Error clearing storage (safe):", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { user: storedUser, token } = await readStoredSession();

        if (storedUser) {
          setUser(storedUser);
        }

        if (token) {
          try {
            const freshUser = await backendMe(token);
            setUser(freshUser);
          } catch (err) {
            console.warn("Session refresh failed, using stored user:", err);
          }
        }
      } catch (error) {
        console.log("Error loading persisted user:", error);
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };

    init();
  }, []);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      const signedInUser = await backendSignIn(email, password);
      setUser(signedInUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(signedInUser));
      await clearFitcoData();
      return { success: true, user: signedInUser };
    } catch (error: any) {
      console.error("[Auth] SignIn error:", error);
      return { success: false, error: { message: error.message } };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<AuthResult> => {
    try {
      const createdUser = await backendSignUp({
        email,
        password,
        firstName,
        lastName,
      });

      // Ensure auth token exists after signup.
      // Some register endpoints return user only; in that case force login.
      let session = await readStoredSession();
      if (!session.token) {
        await backendSignIn(email, password);
        session = await readStoredSession();
      }
      if (!session.token) {
        throw new Error("Signup succeeded but no auth token was issued.");
      }

      await clearFitcoData();

      const blankProfile = {
        userId: createdUser.uid,
        firstName,
        lastName,
        email,
        weight: 70,
        height: 170,
        goal: "maintain_weight",
        activityLevel: "moderately_active",
      };

      const existingProfile = await AsyncStorage.getItem(
        `fitco_user_profile_${createdUser.uid}`,
      );
      if (!existingProfile) {
        await AsyncStorage.setItem(
          `fitco_user_profile_${createdUser.uid}`,
          JSON.stringify(blankProfile),
        );
      }

      const existingSettings = await AsyncStorage.getItem(
        `fitco_settings_${createdUser.uid}`,
      );
      if (!existingSettings) {
        await AsyncStorage.setItem(
          `fitco_settings_${createdUser.uid}`,
          JSON.stringify({}),
        );
      }

      const existingLogs = await AsyncStorage.getItem(
        `fitco_daily_logs_${createdUser.uid}`,
      );
      if (!existingLogs) {
        await AsyncStorage.setItem(
          `fitco_daily_logs_${createdUser.uid}`,
          JSON.stringify({}),
        );
      }

      setUser(createdUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(createdUser));

      return { success: true, user: createdUser };
    } catch (error: any) {
      console.error("[Auth] SignUp error:", error);
      return { success: false, error: { message: error.message } };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await backendLogout();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);

      const keys = await AsyncStorage.getAllKeys();
      const removableKeys = [
        "cachedFoodDatabase",
        "fitco_food_cache",
        "testKey",
        "hasCompletedQuestionnaire",
      ];
      const removable = keys.filter((k) => removableKeys.includes(k));
      if (removable.length > 0) {
        await AsyncStorage.multiRemove(removable);
      }

      setUser(null);
      router.replace("/(auth)");
    } catch (error: any) {
      console.error("[Auth] Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isInitialized, signIn, signUp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
