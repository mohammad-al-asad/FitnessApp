import { getServerUrl, readStoredSession } from "./backend-auth";

export type FoodApiItem = {
  id?: string;
  name: string;
  brand: string;
  serving: string;
  servingSize?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  barcode?: string;
  source?: string;
  createdAt?: string;
};

export type FoodApiPage = {
  items: FoodApiItem[];
  page: number;
  limit: number;
  total: number | null;
  totalPages: number | null;
  hasNextPage: boolean;
};

export type CreateCustomFoodPayload = {
  barcode?: string;
  foodName: string;
  brandName?: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type CreateFoodLogPayload = {
  foodId: string;
  meal: string;
  servings: number;
  servingSize: number;
  servingUnit: string;
};

export type FoodLogsHomeMealItem = {
  id?: string;
  foodId?: string;
  foodName: string;
  brandName: string;
  meal: string;
  servings: number;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodSource?: string;
  loggedAt?: string;
};

export type FoodLogsHomeResponse = {
  date: string;
  goals: {
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
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  progressPercent: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: {
    breakfast: FoodLogsHomeMealItem[];
    lunch: FoodLogsHomeMealItem[];
    dinner: FoodLogsHomeMealItem[];
  };
};

export type FoodLogsWeeklyDay = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hasLog: boolean;
  hitGoal: boolean;
};

export type FoodLogsWeeklySummaryResponse = {
  weekStart: string;
  weekEnd: string;
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  avgCalories: number;
  goalHits: number;
  bestDay: FoodLogsWeeklyDay | null;
  daysCompleted: number;
  progressDays: number;
  days: FoodLogsWeeklyDay[];
};

type FetchLogFoodsParams = {
  page?: number;
  limit?: number;
  search?: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

export function debounceSearch<T extends (...args: any[]) => void>(
  func: T,
  delay = 400,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string {
  return value == null ? "" : String(value);
}

function buildServingLabel(servingSize: unknown, servingUnit: unknown): string {
  const size = asText(servingSize).trim();
  const unit = asText(servingUnit).trim();

  if (size && unit) return `${size} ${unit}`;
  if (size) return size;
  if (unit) return unit;
  return "100 g";
}

function mapFoodRow(raw: any): FoodApiItem {
  const servingSize = raw?.servingSize ?? raw?.["SERVING SIZE"] ?? raw?.serving;
  const servingUnit = raw?.servingUnit ?? raw?.unit;
  const servingLabel = buildServingLabel(servingSize, servingUnit);
  const id = raw?.id ?? raw?._id ?? raw?.foodId;

  return {
    id: id ? String(id) : undefined,
    name: asText(raw?.foodName ?? raw?.name ?? raw?.PRODUCT ?? "Unnamed"),
    brand: asText(raw?.brandName ?? raw?.brand ?? raw?.BRAND),
    serving: servingLabel,
    servingSize: servingLabel,
    calories: toNumber(raw?.calories),
    protein: toNumber(raw?.protein),
    carbs: toNumber(raw?.carbs),
    fats: toNumber(raw?.fat ?? raw?.fats),
    barcode: raw?.barcode ? String(raw.barcode) : undefined,
    source: raw?.source ? String(raw.source) : undefined,
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
  };
}

function extractRowsAndMeta(json: any): { rows: any[]; meta: any } {
  const root = json?.data ?? json;
  const topMeta = json?.meta ?? json?.pagination ?? json ?? {};

  if (Array.isArray(root)) {
    return { rows: root, meta: topMeta };
  }

  if (Array.isArray(root?.data)) {
    return {
      rows: root.data,
      meta: root?.meta ?? root?.pagination ?? topMeta,
    };
  }

  if (Array.isArray(root?.items)) {
    return {
      rows: root.items,
      meta: root?.meta ?? root?.pagination ?? topMeta,
    };
  }

  if (Array.isArray(json?.items)) {
    return { rows: json.items, meta: topMeta };
  }

  if (Array.isArray(json?.data)) {
    return { rows: json.data, meta: topMeta };
  }

  return { rows: [], meta: topMeta };
}

function parseErrorMessage(bodyText: string, fallback: string): string {
  if (!bodyText) return fallback;

  try {
    const parsed = JSON.parse(bodyText);
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // ignore invalid JSON
  }

  return fallback;
}

export async function getLogFoodsPage(
  params: FetchLogFoodsParams = {},
): Promise<FoodApiPage> {
  const page = Math.max(DEFAULT_PAGE, params.page ?? DEFAULT_PAGE);
  const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);
  const search = params.search?.trim() ?? "";

  const url = new URL("/api/v1/food-logs/log-foods", getServerUrl());
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  if (search) {
    url.searchParams.set("search", search);
  }

  const { token } = await readStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  let parsedBody: any = {};
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = {};
    }
  }

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(bodyText, `Failed to load foods (${response.status})`),
    );
  }

  const { rows, meta } = extractRowsAndMeta(parsedBody);
  const items = rows.map(mapFoodRow);

  const currentPage = toOptionalNumber(meta?.page ?? meta?.currentPage) ?? page;
  const currentLimit = toOptionalNumber(meta?.limit ?? meta?.pageSize) ?? limit;
  const total =
    toOptionalNumber(meta?.total ?? meta?.totalItems ?? meta?.count) ?? null;
  const totalPages =
    toOptionalNumber(meta?.totalPages ?? meta?.pages ?? meta?.pageCount) ?? null;

  const explicitHasNext = meta?.hasNextPage ?? meta?.hasNext;
  const hasNextPage =
    typeof explicitHasNext === "boolean"
      ? explicitHasNext
      : totalPages != null
        ? currentPage < totalPages
        : total != null
          ? currentPage * currentLimit < total
          : items.length >= currentLimit;

  return {
    items,
    page: currentPage,
    limit: currentLimit,
    total,
    totalPages,
    hasNextPage,
  };
}

export async function searchFood(query: string): Promise<FoodApiItem[]> {
  const q = query.trim();
  if (!q) return [];

  const page = await getLogFoodsPage({
    page: 1,
    limit: 30,
    search: q,
  });

  return page.items;
}

export async function getFoodByBarcode(
  barcode: string,
): Promise<FoodApiItem | null> {
  const normalized = barcode.trim();
  if (!normalized) return null;

  const url = new URL(
    `/api/v1/custom-foods/scan/barcode/${encodeURIComponent(normalized)}`,
    getServerUrl(),
  );
  const { token } = await readStoredSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  let parsedBody: any = {};
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = {};
    }
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(bodyText, `Failed to scan food barcode (${response.status})`),
    );
  }

  const root = parsedBody?.data ?? parsedBody;
  const rawFood = root?.item ?? root?.food ?? root;
  if (!rawFood || typeof rawFood !== "object") {
    return null;
  }

  return mapFoodRow(rawFood);
}

export async function createCustomFood(
  payload: CreateCustomFoodPayload,
): Promise<FoodApiItem> {
  const url = new URL("/api/v1/custom-foods", getServerUrl());
  const { token } = await readStoredSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  let parsedBody: any = {};
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = {};
    }
  }

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(bodyText, `Failed to create custom food (${response.status})`),
    );
  }

  const root = parsedBody?.data ?? parsedBody;
  return mapFoodRow(root);
}

export async function createFoodLog(
  payload: CreateFoodLogPayload,
): Promise<any> {
  const url = new URL("/api/v1/food-logs", getServerUrl());
  const { token } = await readStoredSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  let parsedBody: any = {};
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = {};
    }
  }

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(bodyText, `Failed to create food log (${response.status})`),
    );
  }

  return parsedBody?.data ?? parsedBody;
}

export async function backendDeleteFoodLog(mealLogId: string): Promise<any> {
  const url = new URL(`/api/v1/food-logs/${mealLogId}`, getServerUrl());
  const { token } = await readStoredSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "DELETE",
      headers,
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(
      parseErrorMessage(bodyText, `Failed to delete food log (${response.status})`),
    );
  }

  return bodyText ? JSON.parse(bodyText) : { message: "Food log deleted" };
}

function mapHomeMealItem(raw: any): FoodLogsHomeMealItem {
  return {
    id: raw?._id ? String(raw._id) : undefined,
    foodId: raw?.food ? String(raw.food) : undefined,
    foodName: asText(raw?.foodName ?? raw?.name ?? "Unnamed"),
    brandName: asText(raw?.brandName ?? raw?.brand ?? ""),
    meal: asText(raw?.meal ?? ""),
    servings: toNumber(raw?.servings),
    servingSize: toNumber(raw?.servingSize),
    servingUnit: asText(raw?.servingUnit ?? "g"),
    calories: toNumber(raw?.calories),
    protein: toNumber(raw?.protein),
    carbs: toNumber(raw?.carbs),
    fat: toNumber(raw?.fat),
    foodSource: raw?.foodSource ? String(raw.foodSource) : undefined,
    loggedAt: raw?.loggedAt ? String(raw.loggedAt) : undefined,
  };
}

function toMealArray(value: unknown): FoodLogsHomeMealItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapHomeMealItem);
}

function mapWeeklyDay(raw: any): FoodLogsWeeklyDay {
  return {
    date: asText(raw?.date),
    calories: toNumber(raw?.calories),
    protein: toNumber(raw?.protein),
    carbs: toNumber(raw?.carbs),
    fat: toNumber(raw?.fat),
    hasLog: Boolean(raw?.hasLog),
    hitGoal: Boolean(raw?.hitGoal),
  };
}

function toWeeklyDays(value: unknown): FoodLogsWeeklyDay[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapWeeklyDay);
}

function normalizeFoodLogsHomeResponse(json: any): FoodLogsHomeResponse {
  const root = json?.data ?? json ?? {};
  const meals = root?.meals ?? {};

  return {
    date: asText(root?.date),
    goals: {
      calories: toNumber(root?.goals?.calories),
      protein: toNumber(root?.goals?.protein),
      carbs: toNumber(root?.goals?.carbs),
      fat: toNumber(root?.goals?.fat),
      macroRatio: (root?.goals?.macroRatio || root?.dailyGoal?.macroRatio)
        ? {
            proteinPercent: toNumber(root?.goals?.macroRatio?.proteinPercent ?? root?.dailyGoal?.macroRatio?.proteinPercent),
            carbsPercent: toNumber(root?.goals?.macroRatio?.carbsPercent ?? root?.dailyGoal?.macroRatio?.carbsPercent),
            fatPercent: toNumber(root?.goals?.macroRatio?.fatPercent ?? root?.dailyGoal?.macroRatio?.fatPercent),
          }
        : undefined,
    },
    totals: {
      calories: toNumber(root?.totals?.calories),
      protein: toNumber(root?.totals?.protein),
      carbs: toNumber(root?.totals?.carbs),
      fat: toNumber(root?.totals?.fat),
    },
    remaining: {
      calories: toNumber(root?.remaining?.calories),
      protein: toNumber(root?.remaining?.protein),
      carbs: toNumber(root?.remaining?.carbs),
      fat: toNumber(root?.remaining?.fat),
    },
    progressPercent: {
      calories: toNumber(root?.progressPercent?.calories),
      protein: toNumber(root?.progressPercent?.protein),
      carbs: toNumber(root?.progressPercent?.carbs),
      fat: toNumber(root?.progressPercent?.fat),
    },
    meals: {
      breakfast: toMealArray(meals?.breakfast),
      lunch: toMealArray(meals?.lunch),
      dinner: toMealArray(meals?.dinner),
    },
  };
}

function normalizeFoodLogsWeeklySummaryResponse(
  json: any,
): FoodLogsWeeklySummaryResponse {
  const root = json?.data ?? json ?? {};
  const bestDayRaw = root?.bestDay;

  return {
    weekStart: asText(root?.weekStart),
    weekEnd: asText(root?.weekEnd),
    goals: {
      calories: toNumber(root?.goals?.calories),
      protein: toNumber(root?.goals?.protein),
      carbs: toNumber(root?.goals?.carbs),
      fat: toNumber(root?.goals?.fat),
    },
    avgCalories: toNumber(root?.avgCalories),
    goalHits: toNumber(root?.goalHits),
    bestDay:
      bestDayRaw && typeof bestDayRaw === "object" ? mapWeeklyDay(bestDayRaw) : null,
    daysCompleted: toNumber(root?.daysCompleted),
    progressDays: toNumber(root?.progressDays),
    days: toWeeklyDays(root?.days),
  };
}

export async function getFoodLogsHome(
  date: string,
): Promise<FoodLogsHomeResponse> {
  const normalizedDate = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const url = new URL("/api/v1/food-logs/home", getServerUrl());
  url.searchParams.set("date", normalizedDate);

  const { token } = await readStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  let parsedBody: any = {};
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = {};
    }
  }

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(bodyText, `Failed to load home food logs (${response.status})`),
    );
  }

  return normalizeFoodLogsHomeResponse(parsedBody);
}

export async function getFoodLogsWeeklySummary(
  startDate: string,
): Promise<FoodLogsWeeklySummaryResponse> {
  const normalizedStartDate = String(startDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedStartDate)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const url = new URL("/api/v1/food-logs/weekly-summary", getServerUrl());
  url.searchParams.set("startDate", normalizedStartDate);

  const { token } = await readStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
  } catch (error: any) {
    const rawMessage = String(error?.message ?? "").toLowerCase();
    const isNetworkError =
      rawMessage.includes("network request failed") ||
      rawMessage.includes("failed to fetch");

    if (isNetworkError) {
      throw new Error(
        `Cannot reach backend at ${url.toString()}. Check EXPO_PUBLIC_SERVER_URL and backend availability.`,
      );
    }

    throw error;
  }

  const bodyText = await response.text();
  let parsedBody: any = {};
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = {};
    }
  }

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(
        bodyText,
        `Failed to load weekly summary (${response.status})`,
      ),
    );
  }

  return normalizeFoodLogsWeeklySummaryResponse(parsedBody);
}
