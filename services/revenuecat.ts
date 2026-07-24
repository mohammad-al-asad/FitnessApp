import { Platform } from "react-native";
import Purchases from "react-native-purchases";

import { readStoredSession } from "@/services/backend-auth";

let isConfigured = false;
let configurePromise: Promise<void> | null = null;
let configuredAppUserID: string | null = null;
let logHandlerConfigured = false;

const getRevenueCatApiKey = () => {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || "";
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || "";
  }

  return "";
};

const normalizeAppUserID = (appUserID?: string | null) => {
  const value = appUserID?.trim();
  return value ? value : null;
};

const isAnonymousLogoutError = (error: unknown) => {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();

  return (
    message.includes("current user is anonymous") ||
    message.includes("called logout but the current user is anonymous")
  );
};

const configureLogHandler = () => {
  if (logHandlerConfigured) return;

  Purchases.setLogHandler((logLevel, message) => {
    console.log(`[RevenueCat] [${logLevel}] ${message}`);
  });
  logHandlerConfigured = true;
};

const getStoredAppUserID = async () => {
  const { user } = await readStoredSession();
  return normalizeAppUserID(user?.uid);
};

const logInRevenueCatUser = async (appUserID: string) => {
  const currentAppUserID = await Purchases.getAppUserID().catch(() => null);
  if (currentAppUserID === appUserID) {
    configuredAppUserID = appUserID;
    return;
  }

  await Purchases.logIn(appUserID);
  configuredAppUserID = appUserID;
};

const syncStoredUserAttributes = async () => {
  try {
    const { user } = await readStoredSession();
    if (user && isConfigured) {
      if (user.email) {
        await Purchases.setEmail(user.email);
      }
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName;
      if (name) {
        await Purchases.setDisplayName(name);
      }
    }
  } catch (err) {
    console.error("Failed to sync RevenueCat user attributes:", err);
  }
};

export const ensureRevenueCatConfigured = async (
  appUserID?: string | null,
) => {
  const requestedAppUserID = normalizeAppUserID(appUserID);

  if (isConfigured) {
    if (requestedAppUserID && configuredAppUserID !== requestedAppUserID) {
      await logInRevenueCatUser(requestedAppUserID);
    }
    await syncStoredUserAttributes();
    return;
  }

  if (!configurePromise) {
    configurePromise = (async () => {
      configureLogHandler();

      const apiKey = getRevenueCatApiKey();
      if (!apiKey) {
        console.warn("RevenueCat API key is missing for this platform.");
        return;
      }

      const initialAppUserID =
        requestedAppUserID ?? (await getStoredAppUserID());

      Purchases.configure(
        initialAppUserID
          ? {
              apiKey,
              appUserID: initialAppUserID,
            }
          : { apiKey },
      );

      isConfigured = true;
      configuredAppUserID = initialAppUserID;
    })().finally(() => {
      configurePromise = null;
    });
  }

  await configurePromise;

  if (requestedAppUserID && configuredAppUserID !== requestedAppUserID) {
    await logInRevenueCatUser(requestedAppUserID);
  }

  await syncStoredUserAttributes();
};

export const configureRevenueCatForStoredUser = async () => {
  const storedAppUserID = await getStoredAppUserID();
  await ensureRevenueCatConfigured(storedAppUserID);
};

export const logOutRevenueCatUser = async () => {
  if (!isConfigured) {
    configuredAppUserID = null;
    return;
  }

  try {
    await Purchases.logOut();
  } catch (error) {
    if (!isAnonymousLogoutError(error)) {
      throw error;
    }

    console.log(
      "[RevenueCat] Skipping logOut because the current user is already anonymous.",
    );
  } finally {
    configuredAppUserID = null;
  }
};
