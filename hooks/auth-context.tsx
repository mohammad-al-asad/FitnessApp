import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  backendLogout,
  backendMe,
  backendSignIn,
  backendSignUp,
  backendSyncRevenueCat,
  readStoredSession,
  type BackendUser,
  type RegisterResponse,
} from "@/services/backend-auth";
import {
  ensureRevenueCatConfigured,
  logOutRevenueCatUser,
} from "@/services/revenuecat";
import { subscribeToRevenueCatSync } from "@/services/subscription-sync-events";
import {
  ONBOARDING_ANSWERS_KEY,
  clearReferralCodeStatus,
  clearSuperwallOnboardingCompletion,
  getStoredOnboardingAuthPayload,
  markSuperwallOnboardingCompleted,
  saveReferralCodeStatus,
  type ReferralCodeStatus,
} from "@/services/superwall-flow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const USER_STORAGE_KEY = "fitco_auth_user";
const FIRST_SIGN_IN_SUBSCRIPTION_PROMPT_SEEN_PREFIX =
  "fitco_first_sign_in_subscription_prompt_seen_";
const FIRST_SIGN_IN_SUBSCRIPTION_PROMPT_PENDING_PREFIX =
  "fitco_first_sign_in_subscription_prompt_pending_";

type AuthResult =
  | { success: true; user: BackendUser; requiresVerification?: false }
  | {
      success: true;
      requiresVerification: true;
      email: string;
      message: string;
      referralCode?: string;
      referralCodeStatus: ReferralCodeStatus;
    }
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
  syncSubscription: (source?: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const isUserSubscribed = (user: BackendUser | null | undefined) =>
  Boolean(
    user?.isSubscribed ||
      user?.subscriptionStatus === "active" ||
      user?.subscriptionStatus === "premium",
  );

const mergeUserPreservingSubscription = (
  previousUser: BackendUser | null,
  nextUser: BackendUser | null,
) => {
  if (!previousUser || !nextUser || previousUser.uid !== nextUser.uid) {
    return nextUser;
  }

  if (!isUserSubscribed(previousUser) || isUserSubscribed(nextUser)) {
    return nextUser;
  }

  return {
    ...nextUser,
    isSubscribed: previousUser.isSubscribed,
    subscriptionStatus: previousUser.subscriptionStatus,
    subscriptionExpiry: previousUser.subscriptionExpiry,
  };
};

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
          setUser((currentUser) =>
            mergeUserPreservingSubscription(currentUser, storedUser),
          );
        }

        if (token) {
          try {
            const freshUser = await backendMe(token);
            if (isMounted) {
              setUser((currentUser) =>
                mergeUserPreservingSubscription(currentUser, freshUser),
              );
            }
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

  useEffect(() => {
    const unsubscribe = subscribeToRevenueCatSync((event) => {
      if (event.type !== "completed") return;

      console.log(
        `[Auth] Received purchase-triggered RevenueCat sync event: ${JSON.stringify(
          {
            success: event.response.success,
            message: event.response.message,
            normalized: event.response.normalized,
            subscription: event.response.subscription,
            user: event.response.user
              ? {
                  uid: event.response.user.uid,
                  email: event.response.user.email,
                  subscriptionStatus: event.response.user.subscriptionStatus,
                  subscriptionExpiry: event.response.user.subscriptionExpiry,
                  isSubscribed: event.response.user.isSubscribed,
                }
              : null,
          },
          null,
          2,
        )}`,
      );

      if (event.response.user) {
        setUser((currentUser) =>
          mergeUserPreservingSubscription(currentUser, event.response.user!),
        );
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);

      const signedInUser = await backendSignIn(email, password);
      if (signedInUser.isVerified === false) {
        await backendLogout();
        return {
          success: false,
          error: {
            message: "Please verify your email with the OTP sent to you.",
          },
        };
      }
      await ensureRevenueCatConfigured(signedInUser.uid);
      setUser((currentUser) =>
        mergeUserPreservingSubscription(currentUser, signedInUser),
      );
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
      const registerPayload = {
        ...(await getStoredOnboardingAuthPayload()),
        email,
        password,
        firstName,
        lastName,
      };

      const registration: RegisterResponse = await backendSignUp(
        registerPayload,
      );
      await markSuperwallOnboardingCompleted();
      await saveReferralCodeStatus(registration.referralCodeStatus);
      setFirstSignInSubscriptionPromptVisible(false);
      setSubscriptionPromptUserId(null);

      return {
        success: true,
        requiresVerification: true,
        email: registration.email || email,
        message: registration.message,
        referralCode: registration.referralCode,
        referralCodeStatus: registration.referralCodeStatus,
      };
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
      const { user: storedUser, token } = await readStoredSession();
      let nextUser = storedUser;

      if (token) {
        try {
          nextUser = await backendMe(token);
        } catch {
          nextUser = storedUser;
        }
      }

      if (nextUser?.uid) {
        await ensureRevenueCatConfigured(nextUser.uid);
      }

      setUser((currentUser) =>
        mergeUserPreservingSubscription(currentUser, nextUser),
      );
      return nextUser;
    } catch (error) {
      console.error("[Auth] Failed to refresh user:", error);
      return null;
    }
  };

  const syncSubscription = async (
    source = "auth-context.syncSubscription",
  ): Promise<boolean> => {
    try {
      const res = await backendSyncRevenueCat(source);
      console.log(
        `[Auth] backendSyncRevenueCat response (${source}): ${JSON.stringify(
          {
            success: res.success,
            message: res.message,
            normalized: res.normalized,
            subscription: res.subscription,
            user: res.user
              ? {
                  uid: res.user.uid,
                  email: res.user.email,
                  subscriptionStatus: res.user.subscriptionStatus,
                  subscriptionExpiry: res.user.subscriptionExpiry,
                  isSubscribed: res.user.isSubscribed,
                }
              : null,
          },
          null,
          2,
        )}`,
      );
      if (res.user) {
        setUser((currentUser) =>
          mergeUserPreservingSubscription(currentUser, res.user!),
        );
        return Boolean(res.user.isSubscribed);
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
      await logOutRevenueCatUser();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await clearSuperwallOnboardingCompletion();
      await clearReferralCodeStatus();
      await AsyncStorage.removeItem(ONBOARDING_ANSWERS_KEY);

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
