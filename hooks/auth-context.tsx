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
import Purchases from "react-native-purchases";

const USER_STORAGE_KEY = "fitco_auth_user";
const FIRST_SIGN_IN_SUBSCRIPTION_PROMPT_SEEN_PREFIX =
  "fitco_first_sign_in_subscription_prompt_seen_";
const FIRST_SIGN_IN_SUBSCRIPTION_PROMPT_PENDING_PREFIX =
  "fitco_first_sign_in_subscription_prompt_pending_";

type AuthResult =
  | { success: true; user: BackendUser }
  | { success: false; error: { message: string } };

type AuthContextType = {
  user: BackendUser | null;
  loading: boolean;
  isInitialized: boolean;
  firstSignInSubscriptionPromptVisible: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<AuthResult>;
  markFirstSignInSubscriptionPromptPending: () => Promise<void>;
  showFirstSignInSubscriptionPromptIfPending: () => Promise<void>;
  completeFirstSignInSubscriptionPrompt: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firstSignInSubscriptionPromptVisible, setFirstSignInSubscriptionPromptVisible] =
    useState(false);
  const [subscriptionPromptUserId, setSubscriptionPromptUserId] = useState<string | null>(null);

  const getSubscriptionPromptSeenKey = (uid: string) =>
    `${FIRST_SIGN_IN_SUBSCRIPTION_PROMPT_SEEN_PREFIX}${uid}`;
  const getSubscriptionPromptPendingKey = (uid: string) =>
    `${FIRST_SIGN_IN_SUBSCRIPTION_PROMPT_PENDING_PREFIX}${uid}`;

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
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const { user: storedUser, token } = await readStoredSession();

        if (!isMounted) return;

        if (storedUser) {
          setUser(storedUser);
        }

        if (token) {
          try {
            const freshUser = await backendMe(token);
            if (isMounted) setUser(freshUser);
          } catch {
          }
        }
      } catch {
      } finally {
        if (isMounted) {
          setIsInitialized(true);
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (user?.uid) {
      Purchases.logIn(user.uid).catch((err) =>
        console.error("RevenueCat logIn error:", err),
      );
      return;
    }

    let isCancelled = false;

    const logOutIdentifiedRevenueCatUser = async () => {
      try {
        const isAnonymous = await Purchases.isAnonymous();
        if (isCancelled || isAnonymous) return;
        await Purchases.logOut();
      } catch (err) {
        console.error("RevenueCat logOut error:", err);
      }
    };

    logOutIdentifiedRevenueCatUser();

    return () => {
      isCancelled = true;
    };
  }, [isInitialized, user?.uid]);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);

      const signedInUser = await backendSignIn(email, password);
      setUser(signedInUser);
      await clearFitcoData();

      return { success: true, user: signedInUser };
    } catch (error: any) {
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
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);

      return { success: true, user: createdUser };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  };

  const markFirstSignInSubscriptionPromptPending = async (): Promise<void> => {
    try {
      if (!user?.uid) return;
      await AsyncStorage.setItem(getSubscriptionPromptPendingKey(user.uid), "1");
    } catch (error) {
      console.error(
        "[Auth] Failed to mark first sign-in subscription prompt as pending:",
        error,
      );
    }
  };

  const showFirstSignInSubscriptionPromptIfPending = async (): Promise<void> => {
    try {
      if (!user?.uid) return;

      const [isPending, hasSeenSubscriptionPrompt] = await Promise.all([
        AsyncStorage.getItem(getSubscriptionPromptPendingKey(user.uid)),
        AsyncStorage.getItem(getSubscriptionPromptSeenKey(user.uid)),
      ]);

      if (isPending && !hasSeenSubscriptionPrompt) {
        setSubscriptionPromptUserId(user.uid);
        setFirstSignInSubscriptionPromptVisible(true);
        return;
      }

      if (isPending && hasSeenSubscriptionPrompt) {
        await AsyncStorage.removeItem(getSubscriptionPromptPendingKey(user.uid));
      }

      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);
    } catch (error) {
      console.error(
        "[Auth] Failed to evaluate first sign-in subscription prompt:",
        error,
      );
    }
  };

  const completeFirstSignInSubscriptionPrompt = async (): Promise<void> => {
    try {
      if (subscriptionPromptUserId) {
        await Promise.all([
          AsyncStorage.setItem(
            getSubscriptionPromptSeenKey(subscriptionPromptUserId),
            "1",
          ),
          AsyncStorage.removeItem(
            getSubscriptionPromptPendingKey(subscriptionPromptUserId),
          ),
        ]);
      }
    } catch {
    } finally {
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);
    }
  };

  const logout = async (): Promise<void> => {
    let hasError = false;
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
    } catch (error: any) {
      hasError = true;
      console.error("[Auth] Logout error:", error);
    } finally {
      // Always force local sign-out UX even if backend/storage cleanup fails.
      setUser(null);
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);
      router.replace("/(auth)");
      if (hasError) {
        // Keep this non-blocking and visible for debugging only.
        console.warn("[Auth] Forced local logout after cleanup failure.");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isInitialized,
        firstSignInSubscriptionPromptVisible,
        signIn,
        signUp,
        markFirstSignInSubscriptionPromptPending,
        showFirstSignInSubscriptionPromptIfPending,
        completeFirstSignInSubscriptionPrompt,
        logout,
      }}
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
