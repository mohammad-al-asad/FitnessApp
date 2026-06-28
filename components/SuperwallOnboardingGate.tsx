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
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import { useAuth } from "@/hooks/auth-context";
import { ensureRevenueCatConfigured } from "@/services/revenuecat";
import {
  ONBOARDING_ANSWERS_KEY,
  ONBOARDING_COMPLETED_KEY,
  SUPERWALL_ONBOARDING_PLACEMENT,
  SUPERWALL_PAYWALL_PLACEMENT,
  getPaywallParams,
  getReferralCodeStatus,
  isSuperwallPurchasedAction,
  isSuperwallSigninAction,
} from "@/services/superwall-flow";
import { router } from "expo-router";

const ONBOARDING_COMPLETE_CALLBACK = "onboarding_complete";
const APP_REVIEW_CALLBACK = "request_app_review";
const APP_REVIEW_REQUESTED_KEY = "fitco_app_review_prompt_requested_v1";
const ONBOARDING_PRELOAD_TIMEOUT_MS = 8000;

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

const isBackendUserSubscribed = (user: ReturnType<typeof useAuth>["user"]) =>
  Boolean(
    user?.isSubscribed ||
      String(user?.subscriptionStatus ?? "").toLowerCase() === "active",
  );

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
  ]);
  const weeklyPace = firstPresentValue(variables, [
    "node.DN1YwTL1JIGoX5qC_yaPl.value",
    "state.selectedWeeklyPace",
    "state.node.DN1YwTL1JIGoX5qC_yaPl.value",
  ]);
  const isMale = firstPresentValue(variables, ["state.sexMale"]);
  const isFemale = firstPresentValue(variables, ["state.sexFemale"]);

  return {
    profile: {
      language: asText(firstPresentValue(variables, ["state.language"])),
      sex: isMale === true ? "Male" : isFemale === true ? "Female" : null,
      birthday: asText(
        firstPresentValue(variables, [
          "node.WyxL7C8EArtT8IawRNYP3.label",
          "state.userBirthday",
        ]),
      ),
      referralCode: asText(
        firstPresentValue(variables, [
          "node.BiD613fc656gmoGLmv6oF.value",
          "state.referralCode",
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

function SuperwallUserSync() {
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
        })
        .catch((error) => {
          console.error("[Superwall] Failed to sign out user:", error);
        });
    }
  }, [
    isConfigured,
    isInitialized,
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
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const { user, isInitialized, syncSubscription, logout } = useAuth();
  const [gateState, setGateState] = useState<GateState>("checking");
  const hasStarted = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReleasedGate = useRef(false);
  const hasCompletedOnboarding = useRef(false);
  const hasLoggedOnboardingAnswers = useRef(false);
  const hasPresentedOnboarding = useRef(false);
  const hasPreloadedOnboarding = useRef(false);
  const isOnboardingActive = useRef(false);
  const activePaywallUserId = useRef<string | null>(null);
  const isHandlingPurchase = useRef(false);
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

  const handlePurchasedCallback = useCallback(async () => {
    if (isHandlingPurchase.current) return;

    isHandlingPurchase.current = true;
    try {
      console.log(
        "[Superwall] purchased callback received. Syncing subscription with backend...",
      );
      const isSubscribed = await syncSubscription();
      if (isSubscribed) {
        activePaywallUserId.current = null;
        console.log(
          "[Superwall] Subscription synced successfully. Granting access.",
        );
        await dismiss().catch(() => undefined);
        router.replace("/(tabs)/home");
        return;
      }

      console.warn(
        "[Superwall] Backend sync completed, but the user is still inactive.",
      );
    } catch (err) {
      console.error(
        "[Superwall] Failed to sync subscription on purchased callback:",
        err,
      );
    } finally {
      isHandlingPurchase.current = false;
    }
  }, [dismiss, syncSubscription]);

  const { registerPlacement: registerPaywall } = usePlacement({
    onPresent: () => {
      console.log("[Superwall] Gating paywall presented.");
    },
    onDismiss: () => {
      console.log("[Superwall] Gating paywall dismissed. Logging out...");
      activePaywallUserId.current = null;
      logout().catch(() => undefined);
    },
    onSkip: () => {
      console.log("[Superwall] Gating paywall skipped. Logging out...");
      activePaywallUserId.current = null;
      logout().catch(() => undefined);
    },
    onError: (err) => {
      console.error("[Superwall] Gating paywall error. Logging out:", err);
      activePaywallUserId.current = null;
      logout().catch(() => undefined);
    },
    onCustomCallback: async (callback) => {
      console.log(
        "[Superwall] Gating paywall custom callback:",
        callback.name,
        callback.variables ?? {},
      );
      if (isSuperwallPurchasedAction(callback.name)) {
        await handlePurchasedCallback();
      }
      return { status: "success" };
    },
  });

  useEffect(() => {
    if (!isInitialized || !isConfigured || !user?.uid) return;

    if (isBackendUserSubscribed(user)) {
      activePaywallUserId.current = null;
      return;
    }

    if (activePaywallUserId.current === user.uid) return;
    activePaywallUserId.current = user.uid;

    const presentPaywall = async () => {
      const referralCodeStatus = await getReferralCodeStatus();
      console.log(
        `[Superwall] User is logged in but not subscribed. Presenting ${SUPERWALL_PAYWALL_PLACEMENT} with referralCodeStatus=${referralCodeStatus}.`,
      );

      await registerPaywall({
        placement: SUPERWALL_PAYWALL_PLACEMENT,
        params: getPaywallParams(referralCodeStatus),
        feature: () => {
          console.warn(
            "[Superwall] Subscription paywall did not present; logging out inactive user.",
          );
          logout().catch(() => undefined);
        },
      });
    };

    presentPaywall().catch((error) => {
      activePaywallUserId.current = null;
      console.error("[Superwall] Failed to present subscription paywall:", error);
      logout().catch(() => undefined);
    });
  }, [
    isConfigured,
    isInitialized,
    logout,
    registerPaywall,
    user,
    user?.uid,
    user?.isSubscribed,
    user?.subscriptionStatus,
  ]);

  const releaseGate = useCallback(() => {
    if (hasReleasedGate.current) return;
    hasReleasedGate.current = true;
    setGateState("ready");
  }, []);

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

    try {
      console.log("[Superwall] Marking onboarding complete.");
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    } catch (error) {
      console.error(
        "[Superwall] Failed to save onboarding completion:",
        error,
      );
    } finally {
      releaseGate();
    }
  }, [releaseGate]);

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
      if (variables) {
        logArrangedOnboardingAnswers(variables);
      }
      await completeOnboarding();
      await dismiss().catch(() => undefined);
      router.replace("/(auth)/auth?mode=signin" as any);
    },
    [completeOnboarding, dismiss, logArrangedOnboardingAnswers],
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
      hasPresentedOnboarding.current = true;
      releaseGate();
    },
    onDismiss: () => {
      void completeOnboarding();
    },
    onSkip: (reason) => {
      console.warn(
        `[Superwall] Onboarding placement was skipped: ${reason.type}`,
      );
      continueWithoutCompletion();
    },
    onError: (error) => {
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
      if (isOnboardingActive.current) {
        hasPresentedOnboarding.current = true;
        releaseGate();
      }
    },
    onPaywallDismiss: () => {
      if (isOnboardingActive.current) {
        void completeOnboarding();
      }
    },
    onPaywallSkip: (reason) => {
      if (!isOnboardingActive.current) return;
      console.warn(
        `[Superwall] Automatic onboarding was skipped: ${reason.type}`,
      );
      continueWithoutCompletion();
    },
    onPaywallError: (error) => {
      if (!isOnboardingActive.current) return;
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
        await completeOnboarding();
        await dismiss().catch(() => undefined);
      }
      if (
        isOnboardingActive.current &&
        isSuperwallSigninAction(callback.name)
      ) {
        await openSigninFromOnboarding(callback.variables);
      }
      if (isSuperwallPurchasedAction(callback.name)) {
        await handlePurchasedCallback();
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
      console.log("[Superwall] Custom paywall action:", name);
      if (isSuperwallSigninAction(name)) {
        await openSigninFromOnboarding();
      }
      if (isSuperwallPurchasedAction(name)) {
        await handlePurchasedCallback();
      }
    },
  }); 

  useEffect(() => {
    if (!isInitialized) return;

    if (user) {
      isOnboardingActive.current = false;
      hasStarted.current = false;

      if (isBackendUserSubscribed(user)) {
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

    let isCancelled = false;
    AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)
      .then((value) => {
        if (isCancelled) return;
        if (value === "true") {
          hasCompletedOnboarding.current = true;
          isOnboardingActive.current = false;
          releaseGate();
          return;
        }

        isOnboardingActive.current = true;
        setGateState("waiting");
      })
      .catch(() => {
        if (!isCancelled) {
          isOnboardingActive.current = true;
          setGateState("waiting");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isInitialized, releaseGate, user]);

  useEffect(() => {
    if (!enabled || gateState !== "waiting") return;

    if (configurationError) {
      console.error(
        "[Superwall] Onboarding unavailable because configuration failed:",
        configurationError,
      );
      continueWithoutCompletion();
      return;
    }

    if (!isConfigured || hasStarted.current) return;

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
      console.error("[Superwall] Failed to register onboarding:", error);
      continueWithoutCompletion();
    });

    return () => {
      isCancelled = true;
    };
  }, [
    configurationError,
    completeOnboarding,
    continueWithoutCompletion,
    enabled,
    gateState,
    isConfigured,
    logArrangedOnboardingAnswers,
    preloadOnboarding,
    registerPlacement,
  ]);

  useEffect(
    () => () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    },
    [],
  );

  const shouldBlockForSubscription = Boolean(
    user && !isBackendUserSubscribed(user),
  );

  return (
    <>
      <SuperwallUserSync />
      {gateState === "ready" && !shouldBlockForSubscription ? (
        children
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#4CAF50" size="large" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
});
