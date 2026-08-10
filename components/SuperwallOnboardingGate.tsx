import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import {
  usePlacement,
  useSuperwall,
  useSuperwallEvents,
  useUser as useSuperwallUser,
} from "expo-superwall";
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  InteractionManager,
  StyleSheet,
  View,
} from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import { useAuth } from "@/hooks/auth-context";
import { useLanguage } from "@/hooks/language-context";
import SplashScreen from "@/components/SplashScreen";
import { ensureRevenueCatConfigured } from "@/services/revenuecat";
import { subscribeToRevenueCatSync } from "@/services/subscription-sync-events";
import {
  ONBOARDING_ANSWERS_KEY,
  ONBOARDING_COMPLETED_KEY,
  SUPERWALL_ONBOARDING_PLACEMENT,
  SUPERWALL_PAYWALL_PLACEMENT,
  clearReferralCodeStatus,
  clearSuperwallOnboardingCompletion,
  getPaywallParams,
  getReferralCodeStatus,
  isSuperwallSigninAction,
  subscribeToSuperwallOnboardingRequests,
} from "@/services/superwall-flow";
import { router } from "expo-router";

const ONBOARDING_COMPLETE_CALLBACK = "onboarding_complete";
const APP_REVIEW_CALLBACK = "request_app_review";
const APP_REVIEW_REQUESTED_KEY = "fitco_app_review_prompt_requested_v1";
const ONBOARDING_PRELOAD_TIMEOUT_MS = 8000;
const PRESENTATION_READY_DELAY_MS = 900;
const PRESENTATION_RETRY_DELAY_MS = 2200;
const POST_LOGOUT_PRESENTATION_DELAY_MS = 2500;
const ACTIVITY_NOT_READY_MAX_RETRIES = 5;
const PAYWALL_RELOCK_DELAY_MS = 350;
const PAYWALL_CONFIGURATION_MAX_RETRIES = 3;
const PAYWALL_CONFIGURATION_RETRY_DELAY_MS = 2500;

const isAppReviewAction = (name: string | undefined) => {
  const normalized = String(name ?? "").trim();
  return (
    normalized === APP_REVIEW_CALLBACK ||
    normalized.startsWith(`${APP_REVIEW_CALLBACK}:`) ||
    normalized.startsWith(`${APP_REVIEW_CALLBACK}|`)
  );
};

type GateState = "checking" | "waiting" | "presenting" | "ready";
type SuperwallVariables = Record<string, unknown>;
type FitcoLanguage = "en" | "ar";

const isBackendUserSubscribed = (user: ReturnType<typeof useAuth>["user"]) =>
  Boolean(
    user?.isSubscribed ||
      String(user?.subscriptionStatus ?? "").toLowerCase() === "active",
  );

const isActivityNotReadyError = (error: unknown) => {
  const code = (error as any)?.code;
  const message = String((error as any)?.message ?? error ?? "");

  return (
    code === 103 ||
    message.includes("SWPresentationError: 103") ||
    message.toLowerCase().includes("no activity to present")
  );
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = String((error as any)?.message ?? error ?? "").trim();
  return message || fallback;
};

const isSubscriptionLinkedToAnotherAccountError = (error: unknown) => {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("already linked to another account") ||
    message.includes("linked to another") ||
    message.includes("already linked")
  );
};

const firstPresentValue = (
  variables: SuperwallVariables | undefined,
  keys: string[],
) => {
  if (!variables) return null;

  for (const key of keys) {
    const value = variables[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const asText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  const numberValue = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeOnboardingLanguage = (value: unknown): FitcoLanguage | null => {
  const raw = asText(value)?.trim().toLowerCase();
  if (!raw) return null;

  if (
    raw === "en" ||
    raw === "eng" ||
    raw.includes("english") ||
    raw.includes("الانجليزي") ||
    raw.includes("الإنجليزي")
  ) {
    return "en";
  }

  if (
    raw === "ar" ||
    raw.includes("arabic") ||
    raw.includes("عربي") ||
    raw.includes("العربية")
  ) {
    return "ar";
  }

  return null;
};

const getOnboardingLanguage = (
  variables: SuperwallVariables | undefined,
): FitcoLanguage | null =>
  normalizeOnboardingLanguage(
    firstPresentValue(variables, [
      "state.language",
      "language",
      "state.locale",
      "locale",
      "state.selectedLanguage",
      "selectedLanguage",
    ]),
  );

const asMeasurement = (value: unknown, fallbackUnit: string) => {
  const raw = asText(value);
  if (!raw) return null;

  const unitMatch = raw.match(/[a-zA-Z]+/);
  return {
    raw,
    value: asNumber(value),
    unit: unitMatch?.[0] ?? fallbackUnit,
  };
};

const arrangedOnboardingAnswersFromVariables = (
  variables: SuperwallVariables | undefined,
) => {
  const height = firstPresentValue(variables, [
    "node.1JGskKQ2fnLpTqo2IxNlX.value",
    "state.userHeight",
  ]);
  const currentWeight = firstPresentValue(variables, [
    "node.E_73MdvSkH91mFmei3m9y.value",
    "state.userWeight",
  ]);
  const desiredWeight = firstPresentValue(variables, [
    "node.gPSl3sfvWO-ms4SmWig8L.value",
    "state.userDesiredWeight",
    "user.desiredWeight"
  ]);
  const weeklyPace = firstPresentValue(variables, [
    "node.DN1YwTL1JIGoX5qC_yaPl.value",
    "state.selectedWeeklyPace",
    "state.node.DN1YwTL1JIGoX5qC_yaPl.value",
    "user.weeklyPace"
  ]);
  const isMale = firstPresentValue(variables, ["state.sexMale"]);
  const isFemale = firstPresentValue(variables, ["state.sexFemale"]);

  return {
    profile: {
      language: asText(firstPresentValue(variables, ["state.language"])),
      sex: isMale === true ? "Male" : isFemale === true ? "Female" : null,
      birthday: asText(
        firstPresentValue(variables, [
          "node.WyxL7C8EArtT8IawRNYP3.value",
          "state.userBirthday",
          "user.birthday",
        ]),
      ),
      referralCode: asText(
        firstPresentValue(variables, [
          "node._HRLaQQxpiYPXoqubJgev.value",
          "node.BiD613fc656gmoGLmv6oF.value",
          "state.referralCode",
          "user.refferCode",
        ]),
      ),
    },
    body: {
      height: asMeasurement(height, "cm"),
      currentWeight: asMeasurement(currentWeight, "kg"),
      desiredWeight: asMeasurement(desiredWeight, "kg"),
    },
    goals: {
      goal: asText(firstPresentValue(variables, ["state.selectedGoal"])),
      workoutsPerWeek: asText(
        firstPresentValue(variables, ["state.preferedWeek"]),
      ),
      weeklyPace: asNumber(weeklyPace),
      accomplish: asText(
        firstPresentValue(variables, ["state.selectedAccomplish"]),
      ),
      challenge: asText(
        firstPresentValue(variables, ["state.selectedChallenge"]),
      ),
    },
    acquisition: {
      discovery: asText(
        firstPresentValue(variables, ["state.selectedDiscovery"]),
      ),
      usedPriorApps: asText(
        firstPresentValue(variables, ["state.selectedPriorApps"]),
      ),
    },
  };
};

const subscriptionStatusFromCustomerInfo = (customerInfo: CustomerInfo) => {
  const entitlementIds = Object.keys(customerInfo.entitlements.active);

  if (entitlementIds.length === 0) {
    return { status: "INACTIVE" as const };
  }

  return {
    status: "ACTIVE" as const,
    entitlements: entitlementIds.map((id) => ({
      id,
      type: "SERVICE_LEVEL" as const,
    })),
  };
};

function SuperwallUserSync({
  onAnonymousReady,
  onIdentified,
}: {
  onAnonymousReady?: () => void;
  onIdentified?: () => void;
}) {
  const { user, isInitialized } = useAuth();
  const { identify, update, signOut, setSubscriptionStatus } =
    useSuperwallUser();
  const isConfigured = useSuperwall((state) => state.isConfigured);
  const lastIdentifiedUid = useRef<string | null>(null);
  const lastSyncedAttributes = useRef<string>("");

  const identifyRef = useRef(identify);
  const updateRef = useRef(update);
  const signOutRef = useRef(signOut);
  const setSubscriptionStatusRef = useRef(setSubscriptionStatus);

  useEffect(() => {
    identifyRef.current = identify;
    updateRef.current = update;
    signOutRef.current = signOut;
    setSubscriptionStatusRef.current = setSubscriptionStatus;
  });

  useEffect(() => {
    if (!isConfigured || !isInitialized) return;

    if (user?.uid) {
      const attributes = {
        email: user.email || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        displayName: user.displayName || null,
      };
      const attrString = JSON.stringify(attributes);

      const uidChanged = user.uid !== lastIdentifiedUid.current;
      const attrsChanged = attrString !== lastSyncedAttributes.current;

      if (uidChanged || attrsChanged) {
        const performSync = async () => {
          if (uidChanged) {
            console.log(`[Superwall] Identifying user: ${user.uid}`);
            await identifyRef.current(user.uid);
            lastIdentifiedUid.current = user.uid;
            onIdentified?.();
          }
          if (attrsChanged || uidChanged) {
            console.log(`[Superwall] Updating user attributes:`, attributes);
            await updateRef.current(attributes);
            lastSyncedAttributes.current = attrString;
          }
        };

        performSync().catch((error) => {
          console.error("[Superwall] Failed to sync user:", error);
        });
      }
      return;
    }

    if (lastIdentifiedUid.current) {
        console.log("[Superwall] Signing out user");
        signOutRef.current()
          .then(() => {
            lastIdentifiedUid.current = null;
            lastSyncedAttributes.current = "";
            onAnonymousReady?.();
          })
          .catch((error) => {
            console.error("[Superwall] Failed to sign out user:", error);
            onAnonymousReady?.();
          });
      return;
    }

    onAnonymousReady?.();
  }, [
    isConfigured,
    isInitialized,
    onAnonymousReady,
    onIdentified,
    user?.uid,
    user?.email,
    user?.firstName,
    user?.lastName,
    user?.displayName,
  ]);

  useEffect(() => {
    if (!isConfigured) return;

    let isActive = true;
    const sync = (customerInfo: CustomerInfo) => {
      if (!isActive) return;
      setSubscriptionStatusRef.current(
        subscriptionStatusFromCustomerInfo(customerInfo),
      ).catch((error) => {
        console.error(
          "[Superwall] Failed to sync subscription status:",
          error,
        );
      });
    };

    const listener = (customerInfo: CustomerInfo) => sync(customerInfo);

    ensureRevenueCatConfigured()
      .then(() => {
        if (!isActive) return;
        Purchases.addCustomerInfoUpdateListener(listener);
        return Purchases.getCustomerInfo();
      })
      .then((customerInfo) => {
        if (customerInfo) sync(customerInfo);
      })
      .catch((error) => {
        console.error(
          "[Superwall] RevenueCat subscription sync failed:",
          error,
        );
      });

    return () => {
      isActive = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isConfigured]);

  return null;
}

export default function SuperwallOnboardingGate({
  children,
  enabled,
  onStartupReady,
}: {
  children: ReactNode;
  enabled: boolean;
  onStartupReady?: () => void;
}) {
  const { user, isInitialized, syncSubscription } = useAuth();
  const { changeLanguage, currentLanguage } = useLanguage();
  const [gateState, setGateState] = useState<GateState>("checking");
  const [canPresentSuperwall, setCanPresentSuperwall] = useState(false);
  const [isSuperwallAnonymousReady, setIsSuperwallAnonymousReady] =
    useState(false);
  const [isSubscriptionFallbackOpen, setIsSubscriptionFallbackOpen] =
    useState(false);
  const [presentationRetryNonce, setPresentationRetryNonce] = useState(0);
  const hasStarted = useRef(false);
  const latestUserRef = useRef(user);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentationReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const presentationRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const paywallConfigurationRetryTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityNotReadyRetryCount = useRef(0);
  const paywallConfigurationRetryCount = useRef(0);
  const hasReleasedGate = useRef(false);
  const hasCompletedOnboarding = useRef(false);
  const hasLoggedOnboardingAnswers = useRef(false);
  const hasPresentedOnboarding = useRef(false);
  const hasPreloadedOnboarding = useRef(false);
  const isOnboardingActive = useRef(false);
  const isOpeningSigninFromOnboarding = useRef(false);
  const activePaywallUserId = useRef<string | null>(null);
  const prePaywallSyncUserId = useRef<string | null>(null);
  const didPresentActiveGatingPaywall = useRef(false);
  const isPurchaseSyncInFlight = useRef(false);
  const hasConfirmedSubscriptionAccess = useRef(false);
  const isRequestingReview = useRef(false);
  const { isConfigured, configurationError, dismiss, preloadPaywalls } =
    useSuperwall(
      (state) => ({
        isConfigured: state.isConfigured,
        configurationError: state.configurationError,
        dismiss: state.dismiss,
        preloadPaywalls: state.preloadPaywalls,
        }),
      );

  const handleSuperwallAnonymousReady = useCallback(() => {
    setIsSuperwallAnonymousReady(true);
  }, []);

  const handleSuperwallIdentified = useCallback(() => {
    setIsSuperwallAnonymousReady(false);
  }, []);

  useEffect(() => {
    const previousUserId = latestUserRef.current?.uid;
    const nextUserId = user?.uid;
    latestUserRef.current = user;

    if (!nextUserId) {
      hasConfirmedSubscriptionAccess.current = false;
      prePaywallSyncUserId.current = null;
      return;
    }

    if (previousUserId && previousUserId !== nextUserId) {
      hasConfirmedSubscriptionAccess.current = isBackendUserSubscribed(user);
      prePaywallSyncUserId.current = null;
      return;
    }

    if (isBackendUserSubscribed(user)) {
      hasConfirmedSubscriptionAccess.current = true;
    }
  }, [user]);

  useEffect(() => {
    let isCancelled = false;
    let interactionTask: { cancel?: () => void } | null = null;

    const clearPresentationReadyTimer = () => {
      if (presentationReadyTimer.current) {
        clearTimeout(presentationReadyTimer.current);
        presentationReadyTimer.current = null;
      }
    };

    const scheduleReady = () => {
      clearPresentationReadyTimer();
      interactionTask?.cancel?.();

      if (AppState.currentState !== "active") return;

      interactionTask = InteractionManager.runAfterInteractions(() => {
        presentationReadyTimer.current = setTimeout(() => {
          if (!isCancelled && AppState.currentState === "active") {
            setCanPresentSuperwall(true);
          }
        }, PRESENTATION_READY_DELAY_MS);
      });
    };

    scheduleReady();
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          scheduleReady();
        }
      },
    );

    return () => {
      isCancelled = true;
      clearPresentationReadyTimer();
      interactionTask?.cancel?.();
      appStateSubscription.remove();
    };
  }, []);

  const schedulePresentationRetry = useCallback((reason = "Presentation retry") => {
    if (presentationRetryTimer.current) {
      clearTimeout(presentationRetryTimer.current);
    }

    activityNotReadyRetryCount.current += 1;
    const retryCount = activityNotReadyRetryCount.current;
    if (retryCount > ACTIVITY_NOT_READY_MAX_RETRIES) {
      console.warn(
        `[Superwall] ${reason}. Activity was not ready after ${ACTIVITY_NOT_READY_MAX_RETRIES} retries. Keeping the paid gate closed and retrying.`,
      );
      hasStarted.current = false;
      isOnboardingActive.current = false;
      activityNotReadyRetryCount.current = 0;
    }

    setCanPresentSuperwall(false);
    presentationRetryTimer.current = setTimeout(() => {
      presentationRetryTimer.current = null;
      InteractionManager.runAfterInteractions(() => {
        if (AppState.currentState !== "active") return;
        setCanPresentSuperwall(true);
        setPresentationRetryNonce((value) => value + 1);
      });
    }, PRESENTATION_RETRY_DELAY_MS);
  }, []);

  const relockUnsubscribedUserToPaywall = useCallback((reason: string) => {
    activePaywallUserId.current = null;

    if (presentationRetryTimer.current) {
      clearTimeout(presentationRetryTimer.current);
      presentationRetryTimer.current = null;
    }

    presentationRetryTimer.current = setTimeout(() => {
      presentationRetryTimer.current = null;

      const currentUser = latestUserRef.current;
      if (!currentUser?.uid) {
        hasConfirmedSubscriptionAccess.current = false;
        didPresentActiveGatingPaywall.current = false;
        console.log(
          `[Superwall] ${reason}. No signed-in user remains, so the paywall will not be re-presented.`,
        );
        return;
      }

      if (hasConfirmedSubscriptionAccess.current) {
        activePaywallUserId.current = null;
        didPresentActiveGatingPaywall.current = false;
        console.log(
          `[Superwall] ${reason}. Subscription access was already confirmed, so the paywall will not be re-presented.`,
        );
        return;
      }

      if (isBackendUserSubscribed(currentUser)) {
        didPresentActiveGatingPaywall.current = false;
        console.log(
          `[Superwall] ${reason}. User is now subscribed, so access remains open.`,
        );
        return;
      }

      console.warn(
        `[Superwall] ${reason}. User is still unsubscribed, so the paywall will be shown again.`,
      );
      setCanPresentSuperwall(true);
      setPresentationRetryNonce((value) => value + 1);
    }, PAYWALL_RELOCK_DELAY_MS);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToRevenueCatSync((event) => {
      if (event.type === "started") {
        isPurchaseSyncInFlight.current = true;
        console.log(
          "[Superwall] Purchase-triggered backend sync started. Waiting before deciding paywall access.",
        );
        return;
      }

      if (event.type === "completed") {
        isPurchaseSyncInFlight.current = false;

        if (event.response.user && isBackendUserSubscribed(event.response.user)) {
          latestUserRef.current = event.response.user;
          hasConfirmedSubscriptionAccess.current = true;
          hasReleasedGate.current = true;
          activePaywallUserId.current = null;
          didPresentActiveGatingPaywall.current = false;
          if (retryTimer.current) {
            clearTimeout(retryTimer.current);
            retryTimer.current = null;
          }
          if (presentationRetryTimer.current) {
            clearTimeout(presentationRetryTimer.current);
            presentationRetryTimer.current = null;
          }
          setGateState("ready");
          onStartupReady?.();
          console.log(
            "[Superwall] Purchase-triggered backend sync confirmed an active subscription. Granting access.",
          );
          void dismiss().catch(() => undefined);
          router.replace("/(tabs)/home");
          return;
        }

        relockUnsubscribedUserToPaywall(
          "Purchase-triggered backend sync completed, but the user is still inactive",
        );
        return;
      }

      isPurchaseSyncInFlight.current = false;
      hasConfirmedSubscriptionAccess.current = false;

      if (isSubscriptionLinkedToAnotherAccountError(event.error)) {
        console.warn(
          "[Superwall] Subscription is linked to another account. Showing error to user instead of relocking paywall.",
        );
        Alert.alert(
          "Subscription Error",
          "This subscription is already linked to another account. Please sign in with the original account or contact support.",
          [
            {
              text: "OK",
              onPress: () => {
                relockUnsubscribedUserToPaywall(
                  "User acknowledged linked-account error",
                );
              },
            },
          ],
          { cancelable: false },
        );
        return;
      }

      relockUnsubscribedUserToPaywall(
        "Purchase-triggered backend sync failed",
      );
    });

    return unsubscribe;
  }, [dismiss, onStartupReady, relockUnsubscribedUserToPaywall]);

  const { registerPlacement: registerPaywall } = usePlacement({
    onPresent: () => {
      onStartupReady?.();
      setIsSubscriptionFallbackOpen(false);
      didPresentActiveGatingPaywall.current = true;
      paywallConfigurationRetryCount.current = 0;
      activityNotReadyRetryCount.current = 0;
      console.log("[Superwall] Gating paywall presented.");
    },
    onDismiss: () => {
      if (isPurchaseSyncInFlight.current) {
        console.log(
          "[Superwall] Gating paywall dismissed while purchase sync is still in progress. Waiting for backend sync before deciding access.",
        );
        return;
      }

      relockUnsubscribedUserToPaywall("Gating paywall dismissed");
    },
    onSkip: () => {
      if (isPurchaseSyncInFlight.current) {
        console.log(
          "[Superwall] Gating paywall skipped while purchase sync is still in progress. Waiting for backend sync before deciding access.",
        );
        return;
      }

      relockUnsubscribedUserToPaywall("Gating paywall skipped");
    },
    onError: (err) => {
      if (isActivityNotReadyError(err)) {
        console.warn(
          "[Superwall] Paywall tried to present before Android Activity was ready. Retrying...",
        );
        activePaywallUserId.current = null;
        schedulePresentationRetry();
        return;
      }

      console.error("[Superwall] Gating paywall error. Retrying:", err);
      relockUnsubscribedUserToPaywall("Gating paywall failed");
    },
    onCustomCallback: async (callback) => {
      console.log(
        "[Superwall] Gating paywall custom callback:",
        callback.name,
        callback.variables ?? {},
      );
      return { status: "success" };
    },
  });

  const routeToSubscriptionFallback = useCallback(
    (error: unknown) => {
      const message = getErrorMessage(
        error,
        "Superwall could not be configured, so the subscription paywall could not be presented.",
      ).slice(0, 600);

      console.error(
        "[Superwall] Subscription paywall unavailable after configuration retries. Opening fallback subscription screen:",
        error,
      );

      if (paywallConfigurationRetryTimer.current) {
        clearTimeout(paywallConfigurationRetryTimer.current);
        paywallConfigurationRetryTimer.current = null;
      }

      activePaywallUserId.current = null;
      hasReleasedGate.current = true;
      setGateState("ready");
      setIsSubscriptionFallbackOpen(true);
      onStartupReady?.();
      router.replace(
        `/paywall-fallback?paywallError=${encodeURIComponent(message)}` as any,
      );
    },
    [onStartupReady],
  );

  const retryPaywallConfiguration = useCallback(
    (error: unknown) => {
      const nextRetry = paywallConfigurationRetryCount.current + 1;
      paywallConfigurationRetryCount.current = nextRetry;
      activePaywallUserId.current = null;

      if (nextRetry > PAYWALL_CONFIGURATION_MAX_RETRIES) {
        routeToSubscriptionFallback(error);
        return;
      }

      console.error(
        `[Superwall] Subscription paywall configuration error. Retry ${nextRetry}/${PAYWALL_CONFIGURATION_MAX_RETRIES}:`,
        error,
      );

      if (paywallConfigurationRetryTimer.current) {
        clearTimeout(paywallConfigurationRetryTimer.current);
      }

      paywallConfigurationRetryTimer.current = setTimeout(() => {
        paywallConfigurationRetryTimer.current = null;
        if (AppState.currentState !== "active") return;
        setCanPresentSuperwall(true);
        setPresentationRetryNonce((value) => value + 1);
      }, PAYWALL_CONFIGURATION_RETRY_DELAY_MS);
    },
    [routeToSubscriptionFallback],
  );

  useEffect(() => {
    if (!isInitialized || !user?.uid) {
      return;
    }

    if (hasConfirmedSubscriptionAccess.current) {
      activePaywallUserId.current = null;
      didPresentActiveGatingPaywall.current = false;
      setIsSubscriptionFallbackOpen(false);
      return;
    }

    if (isBackendUserSubscribed(user)) {
      hasConfirmedSubscriptionAccess.current = true;
      activePaywallUserId.current = null;
      didPresentActiveGatingPaywall.current = false;
      setIsSubscriptionFallbackOpen(false);
      return;
    }

    if (isSubscriptionFallbackOpen) {
      return;
    }

    if (configurationError) {
      retryPaywallConfiguration(configurationError);
      return;
    }

    if (!isConfigured || !canPresentSuperwall) {
      return;
    }

    paywallConfigurationRetryCount.current = 0;

    if (prePaywallSyncUserId.current !== user.uid) {
      prePaywallSyncUserId.current = user.uid;
      console.log(
        "[Superwall] User looks unsubscribed on startup. Syncing backend before presenting paywall.",
      );
      void syncSubscription("superwall:pre-paywall-check")
        .then((isSubscribed) => {
          if (isSubscribed) {
            hasConfirmedSubscriptionAccess.current = true;
            hasReleasedGate.current = true;
            activePaywallUserId.current = null;
            didPresentActiveGatingPaywall.current = false;
            setGateState("ready");
            onStartupReady?.();
            void dismiss().catch(() => undefined);
            router.replace("/(tabs)/home");
            return;
          }

          activePaywallUserId.current = null;
          setPresentationRetryNonce((value) => value + 1);
        })
        .catch((error) => {
          console.error(
            "[Superwall] Pre-paywall subscription sync failed:",
            error,
          );
          activePaywallUserId.current = null;
          setPresentationRetryNonce((value) => value + 1);
        });
      return;
    }

    if (activePaywallUserId.current === user.uid) return;
    activePaywallUserId.current = user.uid;
    didPresentActiveGatingPaywall.current = false;

    const presentPaywall = async () => {
      const referralCodeStatus = await getReferralCodeStatus();
      console.log(
        `[Superwall] User is logged in but not subscribed. Presenting ${SUPERWALL_PAYWALL_PLACEMENT} with referralCodeStatus=${referralCodeStatus}.`,
      );

      await registerPaywall({
        placement: SUPERWALL_PAYWALL_PLACEMENT,
        params: getPaywallParams(referralCodeStatus, currentLanguage),
        feature: () => {
          if (
            didPresentActiveGatingPaywall.current ||
            isPurchaseSyncInFlight.current
          ) {
            console.log(
              "[Superwall] Subscription access was granted after paywall presentation. Waiting for the latest backend subscription state.",
            );
            return;
          }

          console.warn(
            "[Superwall] Subscription access was granted without showing the paywall. Syncing backend state before deciding access.",
          );
          void syncSubscription("superwall:gating-feature")
            .then((isSubscribed) => {
              if (isSubscribed) {
                hasConfirmedSubscriptionAccess.current = true;
                activePaywallUserId.current = null;
                didPresentActiveGatingPaywall.current = false;
                console.log(
                  "[Superwall] Backend confirms the user is subscribed without showing the paywall.",
                );
                return;
              }

              relockUnsubscribedUserToPaywall(
                "Subscription paywall did not present",
              );
            })
            .catch((error) => {
              console.error(
                "[Superwall] Failed to sync backend state after the paywall was skipped:",
                error,
              );
              relockUnsubscribedUserToPaywall(
                "Subscription paywall did not present",
              );
            });
        },
      });
    };

    presentPaywall().catch((error) => {
      activePaywallUserId.current = null;
      if (isActivityNotReadyError(error)) {
        console.warn(
          "[Superwall] Paywall registration happened before Android Activity was ready. Retrying...",
        );
        schedulePresentationRetry();
        return;
      }

      console.error("[Superwall] Failed to present subscription paywall:", error);
      didPresentActiveGatingPaywall.current = false;
      relockUnsubscribedUserToPaywall(
        "Subscription paywall presentation failed",
      );
    });
  }, [
    isConfigured,
    isInitialized,
    canPresentSuperwall,
    configurationError,
    currentLanguage,
    isSubscriptionFallbackOpen,
    presentationRetryNonce,
    registerPaywall,
    relockUnsubscribedUserToPaywall,
    retryPaywallConfiguration,
    schedulePresentationRetry,
    user,
    user?.uid,
    user?.isSubscribed,
    user?.subscriptionStatus,
  ]);

  const releaseGate = useCallback(() => {
    if (hasReleasedGate.current) return;
    hasReleasedGate.current = true;
    setGateState("ready");
    onStartupReady?.();
  }, [onStartupReady]);

  const continueWithoutCompletion = useCallback(() => {
    if (hasCompletedOnboarding.current) {
      releaseGate();
      return;
    }

    isOnboardingActive.current = false;
    setGateState("presenting");
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
    }
    retryTimer.current = setTimeout(() => {
      hasStarted.current = false;
      setGateState("waiting");
    }, 3000);
  }, [releaseGate]);

  const completeOnboarding = useCallback(async () => {
    if (hasCompletedOnboarding.current) {
      releaseGate();
      return;
    }

    hasCompletedOnboarding.current = true;
    isOnboardingActive.current = false;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

    console.log(
      "[Superwall] Onboarding presentation finished. Completion will be saved after signup.",
    );
    releaseGate();
  }, [releaseGate]);

  const applyOnboardingLanguage = useCallback(
    async (variables: SuperwallVariables | undefined) => {
      const onboardingLanguage = getOnboardingLanguage(variables);
      if (!onboardingLanguage || onboardingLanguage === currentLanguage) {
        return;
      }

      try {
        console.log(
          `[Superwall] Applying onboarding language: ${onboardingLanguage}`,
        );
        await changeLanguage(onboardingLanguage);
      } catch (error) {
        console.error(
          "[Superwall] Failed to apply onboarding language:",
          error,
        );
      }
    },
    [changeLanguage, currentLanguage],
  );

  const logArrangedOnboardingAnswers = useCallback(
    (variables: SuperwallVariables | undefined) => {
      if (hasLoggedOnboardingAnswers.current) return;

      hasLoggedOnboardingAnswers.current = true;
      const arrangedAnswers =
        arrangedOnboardingAnswersFromVariables(variables);
      console.log(
        `[Superwall] Arranged onboarding answers:\n${JSON.stringify(
          arrangedAnswers,
          null,
          2,
        )}`,
      );
      AsyncStorage.setItem(ONBOARDING_ANSWERS_KEY, JSON.stringify(arrangedAnswers))
        .catch((err) => {
          console.error("[Superwall] Failed to save onboarding answers:", err);
        });
    },
    [],
  );

  const openSigninFromOnboarding = useCallback(
    async (variables?: SuperwallVariables) => {
      if (isOpeningSigninFromOnboarding.current) return;
      isOpeningSigninFromOnboarding.current = true;

      if (variables) {
        logArrangedOnboardingAnswers(variables);
      }
      await applyOnboardingLanguage(variables);
      router.replace("/(auth)/signin" as any);
      await dismiss().catch(() => undefined);
      await completeOnboarding();
      setTimeout(() => {
        isOpeningSigninFromOnboarding.current = false;
      }, 500);
    },
    [
      applyOnboardingLanguage,
      completeOnboarding,
      dismiss,
      logArrangedOnboardingAnswers,
    ],
  );

  const requestAppReview = useCallback(async () => {
    if (isRequestingReview.current) {
      console.log("[StoreReview] Skipping app review; request already active.");
      return;
    }

    isRequestingReview.current = true;
    try {
      console.log("[StoreReview] Checking native app review availability.");

      if (!__DEV__) {
        const hasAlreadyRequested = await AsyncStorage.getItem(
          APP_REVIEW_REQUESTED_KEY,
        );
        if (hasAlreadyRequested === "true") {
          console.log(
            "[StoreReview] Skipping app review prompt; already requested on this install.",
          );
          return;
        }
      }

      const [isAvailable, hasAction] = await Promise.all([
        StoreReview.isAvailableAsync(),
        StoreReview.hasAction(),
      ]);

      console.log(
        `[StoreReview] Availability result: isAvailable=${isAvailable}, hasAction=${hasAction}`,
      );

      if (!isAvailable || !hasAction) {
        console.warn(
          `[StoreReview] In-app review is not available on this device/build. isAvailable=${isAvailable}, hasAction=${hasAction}`,
        );
        return;
      }

      console.log("[StoreReview] Requesting native app review prompt.");
      await StoreReview.requestReview();
      console.log(
        "[StoreReview] Native app review request completed. The OS may still choose not to show UI.",
      );

      if (!__DEV__) {
        await AsyncStorage.setItem(APP_REVIEW_REQUESTED_KEY, "true");
      }
    } catch (error) {
      console.error("[StoreReview] Failed to request app review:", error);
    } finally {
      isRequestingReview.current = false;
    }
  }, []);

  const preloadOnboarding = useCallback(async () => {
    if (hasPreloadedOnboarding.current) return;

    try {
      console.log(
        `[Superwall] Preloading onboarding paywall for ${SUPERWALL_ONBOARDING_PLACEMENT}.`,
      );

      await Promise.race([
        preloadPaywalls([SUPERWALL_ONBOARDING_PLACEMENT]),
        new Promise<void>((resolve) => {
          setTimeout(resolve, ONBOARDING_PRELOAD_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      console.warn("[Superwall] Onboarding preload failed:", error);
    } finally {
      hasPreloadedOnboarding.current = true;
      console.log("[Superwall] Onboarding preload finished.");
    }
  }, [preloadPaywalls]);

  const { registerPlacement } = usePlacement({
    onPresent: () => {
      activityNotReadyRetryCount.current = 0;
      hasPresentedOnboarding.current = true;
      releaseGate();
    },
    onDismiss: () => {
      if (isOpeningSigninFromOnboarding.current) return;
      void completeOnboarding();
    },
    onSkip: (reason) => {
      if (isOpeningSigninFromOnboarding.current) return;
      console.warn(
        `[Superwall] Onboarding placement was skipped: ${reason.type}`,
      );
      continueWithoutCompletion();
    },
    onError: (error) => {
      if (isActivityNotReadyError(error)) {
        console.warn(
          "[Superwall] Onboarding tried to present before Android Activity was ready. Retrying...",
        );
        hasStarted.current = false;
        isOnboardingActive.current = false;
        setGateState("waiting");
        schedulePresentationRetry();
        return;
      }

      console.error("[Superwall] Onboarding presentation failed:", error);
      continueWithoutCompletion();
    },
    onCustomCallback: async (callback) => {
      console.log(
        "[Superwall] Onboarding placement custom callback:",
        callback.name,
        callback.variables ?? {},
      );

      if (callback.name === ONBOARDING_COMPLETE_CALLBACK) {
        logArrangedOnboardingAnswers(callback.variables);
        await applyOnboardingLanguage(callback.variables);
        await completeOnboarding();
        await dismiss().catch(() => undefined);
      }
      if (isSuperwallSigninAction(callback.name)) {
        await openSigninFromOnboarding(callback.variables);
      }
      if (isAppReviewAction(callback.name)) {
        console.log(
          "[StoreReview] request_app_review custom callback received from Superwall.",
        );
        await requestAppReview();
      }
      return { status: "success" };
    },
  });

  useSuperwallEvents({
    onPaywallPresent: () => {
      activityNotReadyRetryCount.current = 0;
      if (isOnboardingActive.current) {
        hasPresentedOnboarding.current = true;
        releaseGate();
      }
    },
    onPaywallDismiss: () => {
      if (isOpeningSigninFromOnboarding.current) return;
      if (isOnboardingActive.current) {
        void completeOnboarding();
      }
    },
    onPaywallSkip: (reason) => {
      if (isOpeningSigninFromOnboarding.current) return;
      if (!isOnboardingActive.current) return;
      console.warn(
        `[Superwall] Automatic onboarding was skipped: ${reason.type}`,
      );
      continueWithoutCompletion();
    },
    onPaywallError: (error) => {
      if (!isOnboardingActive.current) return;
      if (isActivityNotReadyError(error)) {
        console.warn(
          "[Superwall] Automatic onboarding tried before Android Activity was ready. Retrying...",
        );
        hasStarted.current = false;
        isOnboardingActive.current = false;
        setGateState("waiting");
        schedulePresentationRetry();
        return;
      }

      console.error("[Superwall] Automatic onboarding failed:", error);
      continueWithoutCompletion();
    },
    onCustomCallback: async (callback) => {
      console.log(
        "[Superwall] Onboarding custom callback:",
        callback.name,
        callback.variables ?? {},
      );

      if (
        isOnboardingActive.current &&
        callback.name === ONBOARDING_COMPLETE_CALLBACK
      ) {
        logArrangedOnboardingAnswers(callback.variables);
        await applyOnboardingLanguage(callback.variables);
        await completeOnboarding();
        await dismiss().catch(() => undefined);
      }
      if (
        isOnboardingActive.current &&
        isSuperwallSigninAction(callback.name)
      ) {
        await openSigninFromOnboarding(callback.variables);
      }
      if (isAppReviewAction(callback.name)) {
        console.log(
          "[StoreReview] request_app_review custom callback received from Superwall.",
        );
        await requestAppReview();
      }
      return { status: "success" };
    },
    onCustomPaywallAction: async (name) => {
      if (isSuperwallSigninAction(name)) {
        console.log("[Superwall] Custom paywall action: signin");
        await openSigninFromOnboarding();
      }
    },
  }); 

  useEffect(() => {
    if (!isInitialized) return;

    if (user) {
      setIsSuperwallAnonymousReady(false);
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      isOnboardingActive.current = false;
      hasStarted.current = false;

      if (hasConfirmedSubscriptionAccess.current) {
        releaseGate();
        return;
      }

      if (isBackendUserSubscribed(user)) {
        hasConfirmedSubscriptionAccess.current = true;
        releaseGate();
        return;
      }

      hasReleasedGate.current = false;
      setGateState("presenting");
      return;
    }

    hasReleasedGate.current = false;
    hasStarted.current = false;
    hasPresentedOnboarding.current = false;
    hasLoggedOnboardingAnswers.current = false;
    hasCompletedOnboarding.current = false;
    activePaywallUserId.current = null;
    prePaywallSyncUserId.current = null;
    activityNotReadyRetryCount.current = 0;
    paywallConfigurationRetryCount.current = 0;
    setIsSubscriptionFallbackOpen(false);
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (presentationReadyTimer.current) {
      clearTimeout(presentationReadyTimer.current);
      presentationReadyTimer.current = null;
    }
    if (presentationRetryTimer.current) {
      clearTimeout(presentationRetryTimer.current);
      presentationRetryTimer.current = null;
    }
    if (paywallConfigurationRetryTimer.current) {
      clearTimeout(paywallConfigurationRetryTimer.current);
      paywallConfigurationRetryTimer.current = null;
    }
    setCanPresentSuperwall(false);
    void dismiss().catch(() => undefined);

    let isCancelled = false;
    const scheduleAnonymousOnboarding = () => {
      isOnboardingActive.current = true;
      setGateState("waiting");
      presentationRetryTimer.current = setTimeout(() => {
        presentationRetryTimer.current = null;
        if (isCancelled || AppState.currentState !== "active") return;
        InteractionManager.runAfterInteractions(() => {
          if (isCancelled || AppState.currentState !== "active") return;
          setCanPresentSuperwall(true);
          setPresentationRetryNonce((value) => value + 1);
        });
      }, POST_LOGOUT_PRESENTATION_DELAY_MS);
    };

    AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)
      .then((value) => {
        if (isCancelled) return;
        if (value === "true") {
          hasCompletedOnboarding.current = true;
          isOnboardingActive.current = false;
          releaseGate();
          return;
        }

        scheduleAnonymousOnboarding();
      })
      .catch(() => {
        if (!isCancelled) {
          scheduleAnonymousOnboarding();
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dismiss, isInitialized, releaseGate, user]);

  useEffect(() => {
    const unsubscribe = subscribeToSuperwallOnboardingRequests((reason) => {
      if (latestUserRef.current?.uid) return;

      console.log(`[Superwall] Restarting onboarding from ${reason}.`);
      void Promise.all([
        clearSuperwallOnboardingCompletion(),
        clearReferralCodeStatus(),
        AsyncStorage.removeItem(ONBOARDING_ANSWERS_KEY),
      ]).catch((error) => {
        console.error("[Superwall] Failed to reset onboarding state:", error);
      });

      hasReleasedGate.current = false;
      hasStarted.current = false;
      hasPresentedOnboarding.current = false;
      hasLoggedOnboardingAnswers.current = false;
      hasCompletedOnboarding.current = false;
      isOnboardingActive.current = true;
      activePaywallUserId.current = null;
      prePaywallSyncUserId.current = null;
      activityNotReadyRetryCount.current = 0;

      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (presentationReadyTimer.current) {
        clearTimeout(presentationReadyTimer.current);
        presentationReadyTimer.current = null;
      }
      if (presentationRetryTimer.current) {
        clearTimeout(presentationRetryTimer.current);
        presentationRetryTimer.current = null;
      }

      setCanPresentSuperwall(false);
      setGateState("waiting");
      void dismiss().catch(() => undefined);

      InteractionManager.runAfterInteractions(() => {
        if (AppState.currentState !== "active" || latestUserRef.current?.uid) {
          return;
        }

        setCanPresentSuperwall(true);
        setPresentationRetryNonce((value) => value + 1);
      });
    });

    return unsubscribe;
  }, [dismiss]);

  useEffect(() => {
    if (!enabled || gateState !== "waiting") return;
    if (user) return;
    if (!isSuperwallAnonymousReady) return;

    if (configurationError) {
      console.error(
        "[Superwall] Onboarding unavailable because configuration failed:",
        configurationError,
      );
      continueWithoutCompletion();
      return;
    }

    if (!isConfigured || !canPresentSuperwall || hasStarted.current) return;

    hasStarted.current = true;
    isOnboardingActive.current = true;
    setGateState("presenting");
    let isCancelled = false;

    const presentOnboarding = async () => {
      await preloadOnboarding();
      if (isCancelled) return;

      await registerPlacement({
        placement: SUPERWALL_ONBOARDING_PLACEMENT,
        feature: () => {
          if (isOpeningSigninFromOnboarding.current) return;

          if (
            hasCompletedOnboarding.current ||
            hasPresentedOnboarding.current
          ) {
            console.log(
              "[Superwall] Onboarding feature continued after presentation.",
            );
            void completeOnboarding();
            return;
          }

          console.warn(
            "[Superwall] Onboarding placement did not present; retrying.",
          );
          continueWithoutCompletion();
        },
      });
    };

    presentOnboarding().catch((error) => {
      if (isActivityNotReadyError(error)) {
        console.warn(
          "[Superwall] Onboarding registration happened before Android Activity was ready. Retrying...",
        );
        hasStarted.current = false;
        isOnboardingActive.current = false;
        setGateState("waiting");
        schedulePresentationRetry();
        return;
      }

      console.error("[Superwall] Failed to register onboarding:", error);
      continueWithoutCompletion();
    });

    return () => {
      isCancelled = true;
    };
  }, [
    configurationError,
    completeOnboarding,
    canPresentSuperwall,
    continueWithoutCompletion,
    enabled,
    gateState,
    isConfigured,
    isSuperwallAnonymousReady,
    logArrangedOnboardingAnswers,
    preloadOnboarding,
    presentationRetryNonce,
    registerPlacement,
    schedulePresentationRetry,
    user,
  ]);

  useEffect(
    () => () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (presentationReadyTimer.current) {
        clearTimeout(presentationReadyTimer.current);
        presentationReadyTimer.current = null;
      }
      if (presentationRetryTimer.current) {
        clearTimeout(presentationRetryTimer.current);
        presentationRetryTimer.current = null;
      }
      if (paywallConfigurationRetryTimer.current) {
        clearTimeout(paywallConfigurationRetryTimer.current);
        paywallConfigurationRetryTimer.current = null;
      }
    },
    [],
  );

  const shouldShowAnonymousGate = !user && gateState !== "ready";
  const shouldBlockForSubscription = Boolean(
    user &&
      !isSubscriptionFallbackOpen &&
      !hasConfirmedSubscriptionAccess.current &&
      !isBackendUserSubscribed(user),
  );
  const shouldShowGateOverlay =
    shouldShowAnonymousGate || shouldBlockForSubscription;
  const handleGateSplashFinished = useCallback(() => undefined, []);

  return (
    <View style={styles.container}>
      <SuperwallUserSync
        onAnonymousReady={handleSuperwallAnonymousReady}
        onIdentified={handleSuperwallIdentified}
      />
      {children}
      {shouldShowGateOverlay && (
        <View style={styles.overlay} pointerEvents="auto">
          {shouldShowAnonymousGate ? (
            <SplashScreen onFinish={handleGateSplashFinished} replay />
          ) : (
            <ActivityIndicator color="#4CAF50" size="large" />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    elevation: 9999,
    justifyContent: "center",
    zIndex: 9999,
  },
});
