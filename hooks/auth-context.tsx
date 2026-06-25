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
  backendSyncRevenueCat,
} from "@/services/backend-auth";
import {
  ensureRevenueCatConfigured,
  logOutRevenueCatUser,
} from "@/services/revenuecat";

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
  refreshUser: () => Promise<BackendUser | null>;
  syncSubscription: () => Promise<boolean>;
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

    let isCancelled = false;

    const syncRevenueCatUser = async () => {
      try {
        if (user?.uid) {
          await ensureRevenueCatConfigured(user.uid);
          return;
        }

        if (isCancelled) return;
        await logOutRevenueCatUser();
      } catch (err) {
        console.error("RevenueCat auth sync error:", err);
      }
    };

    syncRevenueCatUser();

    return () => {
      isCancelled = true;
    };
  }, [
    isInitialized,
    user?.uid,
    user?.email,
    user?.firstName,
    user?.lastName,
    user?.displayName,
  ]);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);

      const signedInUser = await backendSignIn(email, password);
      await ensureRevenueCatConfigured(signedInUser.uid);
      setUser(signedInUser);
      await clearFitcoData();

      return { success: true, user: signedInUser };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  };

  const mapOnboardingToRegisterPayload = (
    answersStr: string | null,
    basicInfo: { email: string; password: string; firstName: string; lastName: string }
  ) => {
    const payload: Record<string, any> = { ...basicInfo };

    if (!answersStr) return payload;

    try {
      const answers = JSON.parse(answersStr);
      
      // Parse birthday to age
      if (answers.profile?.birthday) {
        const birthDate = new Date(answers.profile.birthday);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        payload.age = isNaN(age) ? 25 : age;
      } else {
        payload.age = 25; // default fallback
      }

      payload.height = answers.body?.height?.value ?? 170;
      payload.weight = answers.body?.currentWeight?.value ?? 70;
      payload.gender = String(answers.profile?.sex ?? "male").toLowerCase();
      
      // Map activityLevel from workoutsPerWeek or set a default
      const workouts = Number(answers.goals?.workoutsPerWeek ?? 3);
      payload.activityLevel = workouts >= 5 ? "very_active" : workouts >= 3 ? "moderately_active" : "lightly_active";

      // Map goal: "lose_weight", "maintain_weight", "gain_weight"
      const rawGoal = String(answers.goals?.goal ?? "maintain_weight").toLowerCase();
      if (rawGoal.includes("lose") || rawGoal.includes("deficit")) {
        payload.goal = "lose_weight";
      } else if (rawGoal.includes("gain") || rawGoal.includes("surplus") || rawGoal.includes("muscle")) {
        payload.goal = "gain_weight";
      } else {
        payload.goal = "maintain_weight";
      }

      payload.targetWeight = answers.body?.desiredWeight?.value ?? payload.weight;

      // Desired weekly change rate: e.g. 0.25, 0.5, 1.0 (optional/null if maintain_weight)
      if (payload.goal === "maintain_weight") {
        payload.weeklyPace = null;
      } else {
        payload.weeklyPace = answers.goals?.weeklyPace != null ? Number(answers.goals.weeklyPace) : 0.5;
      }

      payload.medicalConditions = answers.goals?.challenge || "";
      payload.allergies = ""; // default empty

    } catch (error) {
      console.error("[Auth] Failed to map onboarding answers:", error);
    }

    return payload;
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<AuthResult> => {
    try {
      const answersStr = await AsyncStorage.getItem("fitco_onboarding_answers");
      const registerPayload = mapOnboardingToRegisterPayload(answersStr, {
        email,
        password,
        firstName,
        lastName,
      });

      const createdUser = await backendSignUp(registerPayload);

      let session = await readStoredSession();
      if (!session.token) {
        await backendSignIn(email, password);
        session = await readStoredSession();
      }
      if (!session.token) {
        throw new Error("Signup succeeded but no auth token was issued.");
      }

      await clearFitcoData();
      await ensureRevenueCatConfigured(createdUser.uid);

      const blankProfile = {
        userId: createdUser.uid,
        firstName,
        lastName,
        email,
        age: 25,
        weight: 70,
        height: 170,
        gender: "male",
        goal: "maintain_weight",
        activityLevel: "moderately_active",
        targetWeight: 70,
        medicalConditions: "",
        allergies: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  const refreshUser = async (): Promise<BackendUser | null> => {
    try {
      const { user: storedUser } = await readStoredSession();
      setUser(storedUser);
      return storedUser;
    } catch (error) {
      console.error("[Auth] Failed to refresh user:", error);
      return null;
    }
  };

  const syncSubscription = async (): Promise<boolean> => {
    try {
      const res = await backendSyncRevenueCat();
      if (res.user) {
        setUser(res.user);
        return res.user.isSubscribed;
      }
      return false;
    } catch (error) {
      console.error("[Auth] syncSubscription failed:", error);
      return false;
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
      router.replace("/");
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
        refreshUser,
        syncSubscription,
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
