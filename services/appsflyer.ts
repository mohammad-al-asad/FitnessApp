import { Platform } from "react-native";
import appsFlyer from "react-native-appsflyer";
import * as TrackingTransparency from "expo-tracking-transparency";
import Purchases from "react-native-purchases";

const APPSFLYER_DEV_KEY =
  process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY || "Whz8WDGaK9zTnsRmPKP95P";
const APPSFLYER_APP_ID =
  process.env.EXPO_PUBLIC_APPSFLYER_APP_ID || "6755593832";
const IS_DEBUG = process.env.EXPO_PUBLIC_APPSFLYER_IS_DEBUG === "true";

// Standard AppsFlyer Event Names
export const AF_EVENTS = {
  START_TRIAL: "af_start_trial",
  SUBSCRIBE: "af_subscribe",
  PURCHASE: "af_purchase",
  COMPLETE_REGISTRATION: "af_complete_registration",
  LOGIN: "af_login",
} as const;

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initialize AppsFlyer SDK
 */
export const initAppsFlyer = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<boolean>((resolve) => {
    if (!APPSFLYER_DEV_KEY) {
      console.warn("[AppsFlyer] Missing EXPO_PUBLIC_APPSFLYER_DEV_KEY");
      resolve(false);
      return;
    }

    // Clean numeric App ID for iOS (remove 'id' prefix if present)
    const cleanAppId = APPSFLYER_APP_ID.replace(/^id/, "");

    const options: any = {
      devKey: APPSFLYER_DEV_KEY,
      isDebug: IS_DEBUG,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
      timeToWaitForATTUserAuthorization: 10, // Wait up to 10 seconds for iOS ATT response
    };

    if (Platform.OS === "ios") {
      options.appId = cleanAppId;
    }

    if (IS_DEBUG) {
      console.log("[AppsFlyer] Initializing with options:", JSON.stringify(options));
    }

    appsFlyer.initSdk(
      options,
      (result) => {
        if (IS_DEBUG) {
          console.log("[AppsFlyer] SDK initialized successfully:", result);
        }
        isInitialized = true;
        // Automatically sync AppsFlyer UID with RevenueCat once initialized
        syncAppsFlyerWithRevenueCat().catch((err) =>
          console.warn("[AppsFlyer] Error syncing with RevenueCat after init:", err),
        );
        resolve(true);
      },
      (error) => {
        console.error("[AppsFlyer] SDK initialization failed:", error);
        resolve(false);
      },
    );
  }).finally(() => {
    initPromise = null;
  });

  return initPromise;
};

/**
 * Request iOS App Tracking Transparency (ATT) permission and initialize AppsFlyer
 */
export const requestTrackingAndInitAppsFlyer = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    if (Platform.OS === "ios") {
      const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
      if (IS_DEBUG) {
        console.log(`[AppsFlyer] ATT Permission status: ${status}`);
      }
    }
  } catch (attError) {
    console.warn("[AppsFlyer] Could not request tracking permissions:", attError);
  }

  return initAppsFlyer();
};

/**
 * Get AppsFlyer Device UID
 */
export const getAppsFlyerUIDAsync = async (): Promise<string | null> => {
  if (Platform.OS === "web") {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    appsFlyer.getAppsFlyerUID((error, appsFlyerUID) => {
      if (error) {
        console.warn("[AppsFlyer] Failed to get AppsFlyer UID:", error);
        resolve(null);
      } else {
        resolve(appsFlyerUID || null);
      }
    });
  });
};

/**
 * Connect AppsFlyer Device UID to RevenueCat for Server-to-Server event forwarding
 */
export const syncAppsFlyerWithRevenueCat = async (): Promise<void> => {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const afUID = await getAppsFlyerUIDAsync();
    if (afUID) {
      if (typeof (Purchases as any).setAppsflyerID === "function") {
        await (Purchases as any).setAppsflyerID(afUID);
      }
      await Purchases.setAttributes({ $appsflyerId: afUID });
      if (IS_DEBUG) {
        console.log(`[AppsFlyer] Successfully synced UID with RevenueCat: ${afUID}`);
      }
    }
  } catch (error) {
    console.warn("[AppsFlyer] Failed to sync AppsFlyer UID with RevenueCat:", error);
  }
};

/**
 * Associate the user ID with AppsFlyer
 */
export const setAppsFlyerCustomerUserId = (userId?: string | null) => {
  if (Platform.OS === "web") {
    return;
  }

  if (!userId) {
    return;
  }

  try {
    appsFlyer.setCustomerUserId(userId, (res) => {
      if (IS_DEBUG) {
        console.log(`[AppsFlyer] Customer user ID set to ${userId}:`, res);
      }
    });
  } catch (error) {
    console.error("[AppsFlyer] Failed to set customer user ID:", error);
  }
};

/**
 * Log a generic in-app event to AppsFlyer
 */
export const trackAppsFlyerEvent = (
  eventName: string,
  eventValues: Record<string, any> = {},
) => {
  if (Platform.OS === "web") {
    return;
  }

  try {
    appsFlyer.logEvent(
      eventName,
      eventValues,
      (res) => {
        if (IS_DEBUG) {
          console.log(`[AppsFlyer] Event logged '${eventName}':`, res);
        }
      },
      (error) => {
        console.error(`[AppsFlyer] Failed to log event '${eventName}':`, error);
      },
    );
  } catch (error) {
    console.error(`[AppsFlyer] Exception in trackAppsFlyerEvent '${eventName}':`, error);
  }
};

export type PurchaseEventParams = {
  productId: string;
  price?: number;
  currency?: string;
  orderId?: string;
  additionalParams?: Record<string, any>;
};

/**
 * Track Free Trial Start (Standard Event: af_start_trial)
 */
export const trackAppsFlyerStartTrial = ({
  productId,
  price,
  currency = "USD",
  orderId,
  additionalParams = {},
}: PurchaseEventParams) => {
  const eventValues: Record<string, any> = {
    af_content_id: productId,
    af_currency: currency,
    ...(price !== undefined ? { af_price: price } : {}),
    ...(orderId ? { af_order_id: orderId } : {}),
    ...additionalParams,
  };

  trackAppsFlyerEvent(AF_EVENTS.START_TRIAL, eventValues);
};

/**
 * Track Subscription Start (Standard Event: af_subscribe)
 */
export const trackAppsFlyerSubscribe = ({
  productId,
  price,
  currency = "USD",
  orderId,
  additionalParams = {},
}: PurchaseEventParams) => {
  const eventValues: Record<string, any> = {
    af_content_id: productId,
    af_currency: currency,
    ...(price !== undefined ? { af_revenue: price, af_price: price } : {}),
    ...(orderId ? { af_order_id: orderId } : {}),
    ...additionalParams,
  };

  trackAppsFlyerEvent(AF_EVENTS.SUBSCRIBE, eventValues);
};

/**
 * Track In-App Purchase (Standard Event: af_purchase)
 */
export const trackAppsFlyerPurchase = ({
  productId,
  price,
  currency = "USD",
  orderId,
  additionalParams = {},
}: PurchaseEventParams) => {
  const eventValues: Record<string, any> = {
    af_content_id: productId,
    af_currency: currency,
    ...(price !== undefined ? { af_revenue: price, af_price: price } : {}),
    ...(orderId ? { af_order_id: orderId } : {}),
    ...additionalParams,
  };

  trackAppsFlyerEvent(AF_EVENTS.PURCHASE, eventValues);
};
