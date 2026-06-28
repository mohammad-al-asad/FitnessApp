import AsyncStorage from "@react-native-async-storage/async-storage";

export const SUPERWALL_ONBOARDING_PLACEMENT =
  process.env.EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT?.trim() ||
  "onboarding";

export const SUPERWALL_PAYWALL_PLACEMENT =
  process.env.EXPO_PUBLIC_SUPERWALL_PAYWALL_PLACEMENT?.trim() || "paywall";

export const ONBOARDING_COMPLETED_KEY =
  "fitco_superwall_onboarding_v1_completed";

export const ONBOARDING_ANSWERS_KEY = "fitco_onboarding_answers";

const REFERRAL_CODE_STATUS_KEY = "fitco_referral_code_status";

export type ReferralCodeStatus = "valid" | "invalid";

export const normalizeReferralCodeStatus = (
  value: unknown,
): ReferralCodeStatus =>
  String(value ?? "").trim().toLowerCase() === "valid" ? "valid" : "invalid";

export const saveReferralCodeStatus = async (value: unknown) => {
  await AsyncStorage.setItem(
    REFERRAL_CODE_STATUS_KEY,
    normalizeReferralCodeStatus(value),
  );
};

export const getReferralCodeStatus = async (): Promise<ReferralCodeStatus> => {
  const stored = await AsyncStorage.getItem(REFERRAL_CODE_STATUS_KEY);
  return normalizeReferralCodeStatus(stored);
};

export const clearReferralCodeStatus = async () => {
  await AsyncStorage.removeItem(REFERRAL_CODE_STATUS_KEY);
};

export const getPaywallParams = (referralCodeStatus?: unknown) => ({
  referralCodeStatus: normalizeReferralCodeStatus(referralCodeStatus),
});

export const clearSuperwallOnboardingCompletion = async () => {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
};

export const normalizeSuperwallActionName = (name: unknown) =>
  String(name ?? "").trim().toLowerCase();

export const isSuperwallSigninAction = (name: unknown) =>
  normalizeSuperwallActionName(name) === "signin";

export const isSuperwallPurchasedAction = (name: unknown) =>
  normalizeSuperwallActionName(name) === "purchased";
