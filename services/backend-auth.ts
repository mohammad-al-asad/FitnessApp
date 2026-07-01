import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeReferralCodeStatus,
  saveReferralCodeStatus,
  type ReferralCodeStatus,
} from "@/services/superwall-flow";

const TOKEN_STORAGE_KEY = "fitco_auth_token";
const REFRESH_TOKEN_STORAGE_KEY = "fitco_refresh_token";
const USER_STORAGE_KEY = "fitco_auth_user";

export type BackendUser = {
  uid: string;
  email: string;
  displayName?: string | null;
  firstName?: string;
  lastName?: string;
  subscriptionStatus?: string;
  subscriptionExpiry?: string | null;
  isSubscribed?: boolean;
  isVerified?: boolean;
  [key: string]: any;
};

export type RegisterResponse = {
  message: string;
  email: string;
  referralCode?: string;
  referralCodeStatus: ReferralCodeStatus;
};

type AuthApiResponse = {
  user: BackendUser;
  token?: string;
  refreshToken?: string;
  referralCodeStatus?: ReferralCodeStatus;
};

export type PublicCmsContent = {
  key: string;
  title: string;
  content: string;
};

export type ReportPayload = {
  issueType: string;
  description: string;
  contactInfo: string;
};

export type UpdateMyProfilePayload = {
  age: number;
  height: number;
  currentWeight: number;
  gender: "male" | "female";
  activityLevel:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extremely_active";
  goal: "lose_weight" | "maintain_weight" | "gain_weight" | "build_muscle";
};

export type UpdateMyHealthPayload = {
  medicalConditions: string;
  foodAllergies: string;
};

export type UpdateMyCompleteProfilePayload = Partial<
  UpdateMyProfilePayload & UpdateMyHealthPayload
>;

export type ProfileSelection = {
  key: string;
  label: string;
  description: string;
};

export type UpdateMyCompleteProfileResponse = {
  message: string;
  activityLevelSelection?: ProfileSelection;
  goalSelection?: ProfileSelection;
  user?: BackendUser;
};

export type DailyGoalPayload = {
  calories: number;
  macroRatio?: {
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
  };
};

export type DailyGoalData = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  macroRatio?: {
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
  };
};

export type UpdateDailyGoalResponse = {
  message: string;
  dailyGoal: DailyGoalData;
  user?: BackendUser;
};

export type ChatHistoryItem = {
  _id?: string;
  prompt: string;
  response: string;
  createdAt?: string;
};

export type ChatLimitStatus = {
  subscriptionStatus: string;
  isUnlimited: boolean;
  dailyFreeLimit: number;
  messagesUsedToday: number;
  messagesLeftToday: number;
  paidMonthlyLimit?: number;
  premiumMonthlyLimit?: number;
  messagesUsedThisMonth?: number;
  messagesLeftThisMonth?: number | null;
};

export type SubscriptionPlan = {
  planType: string;
  interval: string;
  label: string;
  price: number;
  priceCents: number;
  currency: string;
  apple_sku?: string;
  google_sku?: string;
};

export type CreateSubscriptionPayload = {
  planType: string;
  couponCode?: string;
};

export type SubscriptionQuote = {
  planType: string;
  basePrice: number;
  basePriceCents: number;
  finalPrice: number;
  finalPriceCents: number;
  discountAmount: number;
  discountAmountCents: number;
  discountPercentage: number;
  currency: string;
  couponCode?: string;
};

export type ActiveSubscription = {
  id: string;
  platform: string;
  planType: string;
  productId: string;
  price: number;
  expiryDate: string;
  status: string;
  isActive: boolean;
  providerSubscriptionId: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  user: string;
};

export type MySubscriptionStatus = {
  subscribed: boolean;
  subscriptionStatus: string;
  activeSubscription: ActiveSubscription | null;
};

export type CreateSubscriptionResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
  quote?: SubscriptionQuote;
};

export type VerifyApplePurchasePayload = {
  transactionId: string;
  receipt?: string;
  productId?: string;
  purchaseToken?: string;
  jws?: string;
};

export type VerifyGooglePurchasePayload = {
  purchaseToken: string;
  productId?: string;
};

export type VerifyIapResponse = {
  success: boolean;
  message: string;
  user?: BackendUser;
  normalized?: { isActive?: boolean };
  subscription?: { isActive?: boolean };
};

let revenueCatSyncPromise: Promise<VerifyIapResponse> | null = null;
let revenueCatSyncOwner = "unknown";

function normalizeBaseUrl(raw?: string): string {
  const value = (raw || "").trim();
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getServerUrl(): string {
  const base = normalizeBaseUrl(
    process.env.EXPO_PUBLIC_SERVER_URL || process.env.SERVER_URL,
  );

  if (!base) {
    throw new Error(
      "Missing SERVER_URL. Set EXPO_PUBLIC_SERVER_URL in .env for Expo runtime.",
    );
  }

  return base;
}

function toBackendUser(raw: any): BackendUser {
  const uid = String(
    raw?.uid ?? raw?.id ?? raw?._id ?? raw?.userId ?? raw?.user?.id ?? "",
  );

  if (!uid) {
    throw new Error("Backend user payload missing id/uid");
  }

  const email = String(raw?.email ?? raw?.user?.email ?? "");
  const firstName = raw?.firstName ?? raw?.first_name;
  const lastName = raw?.lastName ?? raw?.last_name;
  const fallbackName = [firstName, lastName].filter(Boolean).join(" ");
  const rawDisplayName = raw?.displayName ?? raw?.name ?? fallbackName;
  const displayName = rawDisplayName ? String(rawDisplayName) : null;
  const allergies = raw?.allergies ?? raw?.foodAllergies ?? "";
  const goal = raw?.goal ?? raw?.goals;
  const weight = raw?.weight ?? raw?.currentWeight;

  const subscriptionStatus = raw?.subscriptionStatus ?? raw?.user?.subscriptionStatus ?? "inactive";
  const subscriptionExpiry = raw?.subscriptionExpiry ?? raw?.user?.subscriptionExpiry ?? null;
  const isSubscribed = raw?.isSubscribed ?? raw?.user?.isSubscribed ?? false;
  const isVerified =
    raw?.isVerified ??
    raw?.verified ??
    raw?.emailVerified ??
    raw?.user?.isVerified ??
    raw?.user?.verified ??
    raw?.user?.emailVerified;

  return {
    ...raw,
    uid,
    email,
    firstName,
    lastName,
    displayName,
    allergies,
    goal,
    weight,
    subscriptionStatus,
    subscriptionExpiry,
    isSubscribed: Boolean(isSubscribed),
    ...(isVerified !== undefined ? { isVerified: Boolean(isVerified) } : {}),
  };
}

function extractAuthPayload(json: any): AuthApiResponse {
  const root = json?.data ?? json;
  const rawUser = root?.user ?? root?.account ?? root?.profile ?? root;
  const user = toBackendUser(rawUser);
  const token =
    root?.token ?? root?.accessToken ?? root?.access_token ?? root?.jwt;
  const refreshToken =
    root?.refreshToken ?? root?.refresh_token ?? root?.refresh;
  const referralCodeStatus =
    root?.referralCodeStatus != null
      ? normalizeReferralCodeStatus(root.referralCodeStatus)
      : undefined;

  return { user, token, refreshToken, referralCodeStatus };
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  const record: Record<string, string> = {};

  if (!headers) return record;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      record[key] = value;
    });
    return record;
  }

  Object.entries(headers).forEach(([key, value]) => {
    if (value != null) record[key] = String(value);
  });

  return record;
}

function getAuthHeader(headers: Record<string, string>) {
  const key = Object.keys(headers).find(
    (headerKey) => headerKey.toLowerCase() === "authorization",
  );
  return key ? headers[key] : undefined;
}

function withAuthHeader(
  headers: Record<string, string>,
  token: string | null | undefined,
) {
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

function shouldRefreshForResponse(
  response: Response,
  headers: Record<string, string>,
) {
  const authHeader = getAuthHeader(headers);
  return response.status === 401 && Boolean(authHeader);
}

async function fetchWithNetworkMessage(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error: any) {
    const raw = String(error?.message ?? "");
    const isNetworkError =
      raw.toLowerCase().includes("network request failed") ||
      raw.toLowerCase().includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url}. Check EXPO_PUBLIC_SERVER_URL and ensure the server/tunnel is running.`,
      );
    }

    throw error;
  }
}

let refreshSessionPromise: Promise<AuthApiResponse> | null = null;

async function refreshStoredSession(
  refreshTokenOverride?: string | null,
): Promise<AuthApiResponse> {
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      const { refreshToken: storedRefreshToken } = await readStoredSession();
      const refreshToken = refreshTokenOverride || storedRefreshToken;

      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      const url = `${getServerUrl()}/api/v1/auth/refresh`;
      const response = await fetchWithNetworkMessage(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const text = await response.text();
      const json = text ? safeJson(text) : {};

      if (!response.ok) {
        await clearStoredSession();
        throw new Error(extractErrorMessage(json, response.status));
      }

      const authPayload = extractAuthPayload(json);
      await saveSession(
        authPayload.user,
        authPayload.token,
        authPayload.refreshToken,
      );
      return authPayload;
    })().finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

export async function backendRefreshAuth(): Promise<BackendUser> {
  const { user } = await refreshStoredSession();
  return user;
}

export async function fetchWithAuthRefresh(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const { token } = await readStoredSession();
  const { headers: initHeaders, ...restInit } = init;
  const headers = withAuthHeader(headersToRecord(initHeaders), token);

  let response = await fetch(input, {
    ...restInit,
    headers,
  });

  if (!shouldRefreshForResponse(response, headers)) {
    return response;
  }

  let refreshed: AuthApiResponse | null = null;
  try {
    refreshed = await refreshStoredSession();
  } catch {
    return response;
  }

  if (!refreshed?.token) return response;

  response = await fetch(input, {
    ...restInit,
    headers: withAuthHeader(headers, refreshed.token),
  });

  return response;
}

async function request(path: string, init?: RequestInit): Promise<any> {
  const url = `${getServerUrl()}${path}`;
  const { headers: initHeaders, ...restInit } = init ?? {};
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...headersToRecord(initHeaders),
  };

  let response: Response;
  response = await fetchWithNetworkMessage(url, {
    ...restInit,
    headers,
  });

  if (shouldRefreshForResponse(response, headers)) {
    let refreshed: AuthApiResponse | null = null;
    try {
      refreshed = await refreshStoredSession();
    } catch {
      refreshed = null;
    }

    if (refreshed?.token) {
      response = await fetchWithNetworkMessage(url, {
        ...restInit,
        headers: withAuthHeader(headers, refreshed.token),
      });
    }
  }

  const text = await response.text();
  const json = text ? safeJson(text) : {};

  if (!response.ok) {
    const message = extractErrorMessage(json, response.status);
    throw new Error(message);
  }

  return json;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function extractErrorMessage(json: any, status: number): string {
  if (!json) return `Request failed (${status})`;

  if (typeof json?.message === "string" && json.message.trim()) {
    return json.message;
  }

  if (typeof json?.error === "string" && json.error.trim()) {
    return json.error;
  }

  const details = json?.errors ?? json?.details ?? json?.issues;
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0];
    if (typeof first === "string") return first;
    const field =
      first?.path ?? first?.field ?? first?.param ?? first?.property ?? "";
    const msg = first?.message ?? first?.msg;
    if (typeof msg === "string") {
      return field ? `${field}: ${msg}` : msg;
    }
  }

  if (typeof details === "object" && details !== null) {
    const firstKey = Object.keys(details)[0];
    const val = details[firstKey];
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    if (typeof val === "string") return val;
  }

  return `Request failed (${status})`;
}

async function saveSession(
  user: BackendUser,
  token?: string,
  refreshToken?: string,
) {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
}

export async function readStoredSession(): Promise<{
  user: BackendUser | null;
  token: string | null;
  refreshToken: string | null;
}> {
  try {
    const [storedUser, token, refreshToken] = await Promise.all([
      AsyncStorage.getItem(USER_STORAGE_KEY),
      AsyncStorage.getItem(TOKEN_STORAGE_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
    ]);

    let parsedUser: BackendUser | null = null;
    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser) as BackendUser;
      } catch {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        parsedUser = null;
      }
    }

    return {
      user: parsedUser,
      token,
      refreshToken,
    };
  } catch {
    return { user: null, token: null, refreshToken: null };
  }
}

export async function clearStoredSession() {
  await Promise.all([
    AsyncStorage.removeItem(USER_STORAGE_KEY),
    AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY),
  ]);
}

export async function backendSignIn(
  email: string,
  password: string,
): Promise<BackendUser> {
  const json = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const { user, token, refreshToken } = extractAuthPayload(json);
  await saveSession(user, token, refreshToken);
  return user;
}

export async function backendSignUp(
  params: Record<string, any>,
): Promise<RegisterResponse> {
  const json = await request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const root = json?.data ?? json;
  return {
    message: String(
      root?.message ??
        "Registration successful. Please verify the OTP sent to your email.",
    ),
    email: String(root?.email ?? params.email ?? ""),
    referralCode:
      root?.referralCode != null ? String(root.referralCode) : undefined,
    referralCodeStatus: normalizeReferralCodeStatus(root?.referralCodeStatus),
  };
}

export async function backendMe(token?: string): Promise<BackendUser> {
  const session = token ? { token } : await readStoredSession();
  if (!session.token) throw new Error("No auth token");

  const json = await request("/api/v1/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const { user } = extractAuthPayload(json);
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return user;
}

export async function backendLogout() {
  await clearStoredSession();
}

export async function backendChangePassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  await request("/api/v1/auth/change-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
}

export async function backendDeleteAccount(): Promise<void> {
  const { token } = await readStoredSession();

  if (!token) throw new Error("No auth token");

  await request("/api/v1/auth/delete-account", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function backendGetPublicCms(
  cmsKey: "privacy" | "about" | "terms",
): Promise<PublicCmsContent> {
  const json = await request(
    `/api/v1/cms/public/${encodeURIComponent(cmsKey)}`,
  );
  const root = json?.data ?? json;
  return {
    key: String(root?.key ?? cmsKey),
    title: String(root?.title ?? cmsKey),
    content: String(root?.content ?? ""),
  };
}

export async function backendSubmitReport(
  payload: ReportPayload,
): Promise<void> {
  const { token } = await readStoredSession();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  await request("/api/v1/reports", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function backendSendChatMessage(
  message: string,
  options?: { aiConsent?: boolean },
): Promise<string> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, aiConsent: options?.aiConsent === true }),
  });

  const root = json?.data ?? json;
  return String(root?.message ?? root?.response ?? "");
}

export async function backendGetChatHistory(): Promise<ChatHistoryItem[]> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/chat/history", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const root = json?.data ?? json;
  if (Array.isArray(root)) return root as ChatHistoryItem[];
  if (Array.isArray(root?.items)) return root.items as ChatHistoryItem[];
  if (Array.isArray(root?.history)) return root.history as ChatHistoryItem[];
  return [];
}

export async function backendGetChatLimitStatus(): Promise<ChatLimitStatus> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/chat/limit", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const root = json?.data ?? json;


  return {
    subscriptionStatus: String(root?.subscriptionStatus ?? "free"),
    isUnlimited: Boolean(root?.isUnlimited),
    dailyFreeLimit: Number(root?.dailyFreeLimit ?? 0),
    messagesUsedToday: Number(root?.messagesUsedToday ?? 0),
    messagesLeftToday: Number(root?.messagesLeftToday ?? 0),
    paidMonthlyLimit: root?.paidMonthlyLimit != null ? Number(root.paidMonthlyLimit) : undefined,
    premiumMonthlyLimit: root?.premiumMonthlyLimit != null ? Number(root.premiumMonthlyLimit) : undefined,
    messagesUsedThisMonth: root?.messagesUsedThisMonth != null ? Number(root.messagesUsedThisMonth) : undefined,
    messagesLeftThisMonth: root?.messagesLeftThisMonth !== undefined ? (root.messagesLeftThisMonth === null ? null : Number(root.messagesLeftThisMonth)) : undefined,
  };
}

export async function backendUpdateMyProfile(
  payload: UpdateMyProfilePayload,
): Promise<void> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  await request("/api/v1/users/me/profile", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function backendUpdateMyHealth(
  payload: UpdateMyHealthPayload,
): Promise<void> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  await request("/api/v1/users/me/health", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function backendUpdateMyCompleteProfile(
  payload: UpdateMyCompleteProfilePayload,
): Promise<UpdateMyCompleteProfileResponse> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/users/me/complete-profile", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const root = json?.data ?? json;
  const rawUser = root?.user;
  const normalizedUser = rawUser ? toBackendUser(rawUser) : undefined;

  if (normalizedUser) {
    await AsyncStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify(normalizedUser),
    );
  }

  return {
    message: String(root?.message ?? ""),
    activityLevelSelection: root?.activityLevelSelection
      ? {
          key: String(root.activityLevelSelection?.key ?? ""),
          label: String(root.activityLevelSelection?.label ?? ""),
          description: String(root.activityLevelSelection?.description ?? ""),
        }
      : undefined,
    goalSelection: root?.goalSelection
      ? {
          key: String(root.goalSelection?.key ?? ""),
          label: String(root.goalSelection?.label ?? ""),
          description: String(root.goalSelection?.description ?? ""),
        }
      : undefined,
    user: normalizedUser,
  };
}

function isEndpointMismatchError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("(404)") ||
    lower.includes("(405)") ||
    lower.includes("not found") ||
    lower.includes("cannot post") ||
    lower.includes("cannot patch")
  );
}

function normalizeDailyGoalResponse(json: any): UpdateDailyGoalResponse {
  const root = json?.data ?? json;
  const rawGoal = root?.dailyGoal ?? root?.goal ?? root;
  const rawUser = root?.user;
  const normalizedUser = rawUser ? toBackendUser(rawUser) : undefined;

  return {
    message: String(root?.message ?? "Daily goal updated"),
    dailyGoal: {
      calories: Number(rawGoal?.calories ?? 0),
      protein: Number(rawGoal?.protein ?? 0),
      carbs: Number(rawGoal?.carbs ?? 0),
      fat: Number(rawGoal?.fat ?? 0),
      macroRatio: rawGoal?.macroRatio
        ? {
            proteinPercent: Number(rawGoal.macroRatio?.proteinPercent ?? 0),
            carbsPercent: Number(rawGoal.macroRatio?.carbsPercent ?? 0),
            fatPercent: Number(rawGoal.macroRatio?.fatPercent ?? 0),
          }
        : undefined,
    },
    user: normalizedUser,
  };
}

export async function backendUpdateDailyGoal(
  payload: DailyGoalPayload,
): Promise<UpdateDailyGoalResponse> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const attempts: { method: "PATCH" | "POST"; path: string }[] = [
    { method: "PATCH", path: "/api/v1/users/me/daily-goal" },
    { method: "POST", path: "/api/v1/users/me/daily-goal" },
    { method: "PATCH", path: "/api/v1/users/me/daily-goals" },
    { method: "POST", path: "/api/v1/users/me/daily-goals" },
    { method: "PATCH", path: "/api/v1/users/daily-goal" },
    { method: "POST", path: "/api/v1/users/daily-goal" },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const json = await request(attempt.path, {
        method: attempt.method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = normalizeDailyGoalResponse(json);
      if (result.user) {
        await AsyncStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify(result.user),
        );
      }
      return result;
    } catch (error: any) {
      const message = String(error?.message ?? "");
      lastError = error instanceof Error ? error : new Error(message);

      if (!isEndpointMismatchError(message)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Failed to update daily goal");
}


export async function backendVerifyApplePurchase(
  payload: VerifyApplePurchasePayload,
): Promise<VerifyIapResponse> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/subscription/apple/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });


  const root = json?.data ?? json;
  if (root?.user) {
    await saveSession(toBackendUser(root.user));
  }

  const success = root?.success ?? (root?.normalized?.isActive === true || root?.subscription?.isActive === true);
  
  return {
    success: Boolean(success),
    message: String(root?.message ?? (success ? "Success" : "Subscription not active")),
    user: root?.user ? toBackendUser(root.user) : undefined,
    normalized: root?.normalized,
    subscription: root?.subscription,
  };
}

export async function backendSyncRevenueCat(
  source = "unknown",
): Promise<VerifyIapResponse> {
  if (revenueCatSyncPromise) {
    console.log(
      `[RC sync:${source}] Joining in-flight sync started by ${revenueCatSyncOwner}.`,
    );
    return revenueCatSyncPromise;
  }

  revenueCatSyncOwner = source;
  revenueCatSyncPromise = (async () => {
    const { token } = await readStoredSession();
    if (!token) throw new Error("No auth token");

    console.log(`[RC sync:${source}] Request started.`);
    const json = await request("/api/v1/subscription/revenuecat/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    console.log(`[RC sync:${source}] Response received:`, json);

    const root = json?.data ?? json;
    if (root?.user) {
      await saveSession(toBackendUser(root.user));
    }

    const success =
      root?.success ??
      (root?.normalized?.isActive === true ||
        root?.subscription?.isActive === true);

    return {
      success: Boolean(success),
      message: String(
        root?.message ?? (success ? "Success" : "Subscription not active"),
      ),
      user: root?.user ? toBackendUser(root.user) : undefined,
      normalized: root?.normalized,
      subscription: root?.subscription,
    };
  })();

  try {
    return await revenueCatSyncPromise;
  } finally {
    console.log(`[RC sync:${source}] Sync finished.`);
    revenueCatSyncPromise = null;
    revenueCatSyncOwner = "unknown";
  }
}

export async function backendVerifyGooglePurchase(
  payload: VerifyGooglePurchasePayload,
): Promise<VerifyIapResponse> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/subscription/google/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const root = json?.data ?? json;
  if (root?.user) {
    await saveSession(toBackendUser(root.user));
  }

  const success = root?.success ?? (root?.normalized?.isActive === true || root?.subscription?.isActive === true);

  return {
    success: Boolean(success),
    message: String(root?.message ?? (success ? "Success" : "Subscription not active")),
    user: root?.user ? toBackendUser(root.user) : undefined,
    normalized: root?.normalized,
    subscription: root?.subscription,
  };
}

export async function backendCreateSubscription(
  payload: CreateSubscriptionPayload,
): Promise<CreateSubscriptionResponse> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/subscription", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const root = json?.data ?? json;

  return {
    checkoutSessionId: String(root?.checkoutSessionId ?? ""),
    checkoutUrl: String(root?.checkoutUrl ?? ""),
    quote: root?.quote
      ? {
          planType: String(root.quote?.planType ?? ""),
          basePrice: Number(root.quote?.basePrice ?? 0),
          basePriceCents: Number(root.quote?.basePriceCents ?? 0),
          finalPrice: Number(root.quote?.finalPrice ?? 0),
          finalPriceCents: Number(root.quote?.finalPriceCents ?? 0),
          discountAmount: Number(root.quote?.discountAmount ?? 0),
          discountAmountCents: Number(root.quote?.discountAmountCents ?? 0),
          discountPercentage: Number(root.quote?.discountPercentage ?? 0),
          currency: String(root.quote?.currency ?? "usd"),
          couponCode: root.quote?.couponCode
            ? String(root.quote.couponCode)
            : undefined,
        }
      : undefined,
  };
}

export async function backendGetSubscriptionQuote(
  payload: CreateSubscriptionPayload,
): Promise<SubscriptionQuote> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/subscription/quote", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const root = json?.data ?? json;

  return {
    planType: String(root?.planType ?? ""),
    basePrice: Number(root?.basePrice ?? 0),
    basePriceCents: Number(root?.basePriceCents ?? 0),
    finalPrice: Number(root?.finalPrice ?? 0),
    finalPriceCents: Number(root?.finalPriceCents ?? 0),
    discountAmount: Number(root?.discountAmount ?? 0),
    discountAmountCents: Number(root?.discountAmountCents ?? 0),
    discountPercentage: Number(root?.discountPercentage ?? 0),
    currency: String(root?.currency ?? "usd"),
    couponCode: root?.couponCode ? String(root.couponCode) : undefined,
  };
}

export async function backendGetMySubscriptionStatus(): Promise<MySubscriptionStatus> {
  const { token } = await readStoredSession();
  if (!token) throw new Error("No auth token");

  const json = await request("/api/v1/subscription/status", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const root = json?.data ?? json;
  const active = root?.activeSubscription;

  return {
    subscribed: Boolean(root?.subscribed),
    subscriptionStatus: String(
      root?.subscriptionStatus ?? (root?.subscribed ? "premium" : "free"),
    ),
    activeSubscription: active
      ? {
          id: String(active?._id ?? active?.id ?? ""),
          platform: String(active?.platform ?? ""),
          planType: String(active?.planType ?? ""),
          productId: String(active?.productId ?? ""),
          price: Number(active?.price ?? 0),
          expiryDate: String(active?.expiryDate ?? ""),
          status: String(active?.status ?? ""),
          isActive: Boolean(active?.isActive ?? false),
          providerSubscriptionId: String(
            active?.providerSubscriptionId ?? "",
          ),
          startedAt: String(active?.startedAt ?? ""),
          createdAt: String(active?.createdAt ?? ""),
          updatedAt: String(active?.updatedAt ?? ""),
          user: String(active?.user ?? ""),
        }
      : null,
  };
}

export async function backendGoogleSignIn(payload: {
  idToken: string;
  email?: string;
  [key: string]: any;
}): Promise<BackendUser> {
  console.log("Payload for google: ", payload);
  
  const json = await request("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const { user, token, refreshToken, referralCodeStatus } =
    extractAuthPayload(json);
    console.log("Res from google: ", json);
    
  await saveSession(user, token, refreshToken);
  if (referralCodeStatus) {
    await saveReferralCodeStatus(referralCodeStatus);
  }
  return user;
}

export async function backendAppleSignIn(payload: {
  identityToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}): Promise<BackendUser> {
  const json = await request("/api/v1/auth/apple", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const { user, token, refreshToken, referralCodeStatus } =
    extractAuthPayload(json);
  await saveSession(user, token, refreshToken);
  if (referralCodeStatus) {
    await saveReferralCodeStatus(referralCodeStatus);
  }
  return user;
}

export async function backendVerifyRegister(payload: {
  email: string;
  code: string;
}): Promise<BackendUser> {
  const json = await request("/api/v1/auth/verify-register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const { user, token, refreshToken } = extractAuthPayload(json);
  await saveSession(user, token, refreshToken);
  return user;
}

export async function backendForgotPassword(payload: {
  email: string;
}): Promise<{ message: string }> {
  const json = await request("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return {
    message: json?.message ?? "If the email exists, reset instructions were sent",
  };
}

export async function backendVerifyResetOtp(payload: {
  email: string;
  code: string;
}): Promise<{ message: string }> {
  const json = await request("/api/v1/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { message: json?.message ?? "OTP verified" };
}

export async function backendResetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const json = await request("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      code: payload.code,
      password: payload.newPassword,
    }),
  });
  return { message: json?.message ?? "Password updated" };
}

