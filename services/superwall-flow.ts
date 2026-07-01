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

export type OnboardingAuthPayload = {
  referralCode?: string;
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
  targetWeight?: number;
  weeklyPace?: number | null;
  medicalConditions?: string;
  allergies?: string;
};

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

export const hasCompletedSuperwallOnboarding = async () =>
  (await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)) === "true";

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const textOrEmpty = (value: unknown) =>
  value == null ? "" : String(value).trim();

const calculateAge = (birthday: unknown) => {
  const raw = textOrEmpty(birthday);
  if (!raw) return 25;

  const birthDate = new Date(raw);
  if (Number.isNaN(birthDate.getTime())) return 25;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const hasBirthdayPassed =
    monthDiff > 0 ||
    (monthDiff === 0 && today.getDate() >= birthDate.getDate());
  if (!hasBirthdayPassed) age -= 1;

  return age > 0 && age < 120 ? age : 25;
};

const mapActivityLevel = (workoutsPerWeek: unknown) => {
  const workouts = toNumber(workoutsPerWeek, 3);
  if (workouts >= 6) return "extremely_active";
  if (workouts >= 5) return "very_active";
  if (workouts >= 3) return "moderately_active";
  if (workouts >= 1) return "lightly_active";
  return "sedentary";
};

const mapGoal = (goal: unknown) => {
  const rawGoal = textOrEmpty(goal).toLowerCase();
  if (rawGoal.includes("lose") || rawGoal.includes("deficit")) {
    return "lose_weight";
  }
  if (rawGoal.includes("muscle")) {
    return "build_muscle";
  }
  if (rawGoal.includes("gain") || rawGoal.includes("surplus")) {
    return "gain_weight";
  }
  return "maintain_weight";
};

export const mapOnboardingAnswersToAuthPayload = (
  answersStr: string | null,
): OnboardingAuthPayload => {
  if (!answersStr) return {};

  try {
    const answers = JSON.parse(answersStr);
    const weight = toNumber(answers.body?.currentWeight?.value, 70);
    const goal = mapGoal(answers.goals?.goal);
    const referralCode = textOrEmpty(answers.profile?.referralCode);

    const payload: OnboardingAuthPayload = {
      age: calculateAge(answers.profile?.birthday),
      height: toNumber(answers.body?.height?.value, 170),
      weight,
      gender: textOrEmpty(answers.profile?.sex || "male").toLowerCase(),
      activityLevel: mapActivityLevel(answers.goals?.workoutsPerWeek),
      goal,
      targetWeight: toNumber(answers.body?.desiredWeight?.value, weight),
      weeklyPace:
        goal === "maintain_weight"
          ? null
          : toNumber(answers.goals?.weeklyPace, 0.5),
      medicalConditions: textOrEmpty(answers.goals?.challenge) || "None",
      allergies:
        textOrEmpty(answers.health?.allergies) ||
        textOrEmpty(answers.profile?.allergies) ||
        "None",
    };

    if (referralCode) {
      payload.referralCode = referralCode;
    }

    return payload;
  } catch (error) {
    console.error("[Auth] Failed to map onboarding answers:", error);
    return {};
  }
};

export const getStoredOnboardingAuthPayload = async (
  options: { requireCompleted?: boolean } = {},
): Promise<OnboardingAuthPayload> => {
  if (options.requireCompleted) {
    const isCompleted = await hasCompletedSuperwallOnboarding();
    if (!isCompleted) return {};
  }

  const answersStr = await AsyncStorage.getItem(ONBOARDING_ANSWERS_KEY);
  return mapOnboardingAnswersToAuthPayload(answersStr);
};

export const normalizeSuperwallActionName = (name: unknown) =>
  String(name ?? "").trim().toLowerCase();

export const isSuperwallSigninAction = (name: unknown) =>
  normalizeSuperwallActionName(name) === "signin";
