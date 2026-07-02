import {
  fetchWithAuthRefresh,
  getServerUrl,
  readStoredSession,
} from "./backend-auth";

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

export type UpdateFoodLogPayload = {
  meal?: string;
  foodName?: string;
  servings?: number;
  servingSize?: number;
  servingUnit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fats?: number;
  notes?: string;
};

export type NutritionFactValue = {
  value: number;
  unit: string;
};

export type AiNutritionFacts = {
  calories: NutritionFactValue;
  protein: NutritionFactValue;
  carbs: NutritionFactValue;
  fats: NutritionFactValue;
};

export type AiMealScanPayload = {
  imageBase64: string;
  mimeType: string;
  servingDescription?: string;
};

export type AiMealScanResult = {
  source: string;
  foodName: string;
  servingSize: string;
  confidence: number;
  nutritionFacts: AiNutritionFacts;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes: string;
};

export type SaveAiMealPayload = {
  meal: string;
  imageBase64: string;
  mimeType: string;
  foodName: string;
  confidence?: number;
  nutritionFacts: AiNutritionFacts;
  notes?: string;
};

export type UpdateAiMealPayload = Partial<
  Omit<SaveAiMealPayload, "imageBase64" | "mimeType">
> & {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fats?: number;
  servingSize?: string;
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
  imageUrl?: string;
  confidence?: number | null;
  notes?: string;
  source?: string;
  servingDescription?: string;
  isAi?: boolean;
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

type FoodApiRequestError = Error & { status?: number };

async function requestFoodApi<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const url = new URL(path, getServerUrl());
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(init.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetchWithAuthRefresh(url.toString(), {
      ...init,
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
    const error = new Error(
      parseErrorMessage(bodyText, `${fallbackMessage} (${response.status})`),
    ) as FoodApiRequestError;
    error.status = response.status;
    throw error;
  }

  return parsedBody as T;
}

async function requestFoodApiWithMethodFallback<T>(
  path: string,
  methods: string[],
  payload: unknown,
  fallbackMessage: string,
): Promise<T> {
  let lastError: FoodApiRequestError | null = null;

  for (const method of methods) {
    try {
      return await requestFoodApi<T>(
        path,
        {
          method,
          body: payload == null ? undefined : JSON.stringify(payload),
        },
        fallbackMessage,
      );
    } catch (error: any) {
      lastError = error;
      const canTryNext =
        error?.status === 404 || error?.status === 405 || error?.status === 501;
      if (!canTryNext) throw error;
    }
  }

  throw lastError ?? new Error(fallbackMessage);
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
    response = await fetchWithAuthRefresh(url.toString(), {
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
    response = await fetchWithAuthRefresh(url.toString(), {
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
    response = await fetchWithAuthRefresh(url.toString(), {
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
    response = await fetchWithAuthRefresh(url.toString(), {
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

export async function backendUpdateFoodLog(
  mealLogId: string,
  payload: UpdateFoodLogPayload,
): Promise<any> {
  const normalizedId = String(mealLogId || "").trim();
  if (!normalizedId) {
    throw new Error("Missing food log id.");
  }

  const json = await requestFoodApiWithMethodFallback<any>(
    `/api/v1/food-logs/${encodeURIComponent(normalizedId)}`,
    ["PATCH", "PUT"],
    payload,
    "Failed to update food log",
  );

  return json?.data ?? json;
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
    response = await fetchWithAuthRefresh(url.toString(), {
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

export async function scanAiMeal(
  payload: AiMealScanPayload,
): Promise<AiMealScanResult> {
  const imageBase64 = String(payload.imageBase64 || "").trim();
  if (!imageBase64) {
    throw new Error("Missing meal image.");
  }

  const json = await requestFoodApi<any>(
    "/api/v1/custom-foods/scan/ai",
    {
      method: "POST",
      body: JSON.stringify({
        imageBase64,
        mimeType: payload.mimeType || "image/jpeg",
        servingDescription: payload.servingDescription || "1 visible serving",
      }),
    },
    "Failed to scan meal with AI",
  );

  return normalizeAiMealScanResult(json);
}

export async function saveAiMealScan(payload: SaveAiMealPayload): Promise<{
  message: string;
  foodLog: FoodLogsHomeMealItem | null;
}> {
  const json = await requestFoodApi<any>(
    "/api/v1/custom-foods/scan/ai/save",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to save AI scanned meal",
  );

  return {
    message: asText(json?.message ?? json?.data?.message ?? "AI meal saved"),
    foodLog: normalizeSavedFoodLog(json),
  };
}

export async function updateAiMealScan(
  aiFoodLogId: string,
  payload: UpdateAiMealPayload,
): Promise<{
  message: string;
  foodLog: FoodLogsHomeMealItem | null;
}> {
  const normalizedId = String(aiFoodLogId || "").trim();
  if (!normalizedId) {
    throw new Error("Missing AI food log id.");
  }

  const nextPayload = {
    ...payload,
    nutritionFacts:
      payload.nutritionFacts ??
      buildNutritionFactsFromValues(
        toNumber(payload.calories),
        toNumber(payload.protein),
        toNumber(payload.carbs),
        toNumber(payload.fats ?? payload.fat),
      ),
  };

  const json = await requestFoodApiWithMethodFallback<any>(
    `/api/v1/custom-foods/scan/ai/${encodeURIComponent(normalizedId)}`,
    ["PATCH", "PUT"],
    nextPayload,
    "Failed to update AI scanned meal",
  );

  return {
    message: asText(json?.message ?? json?.data?.message ?? "AI meal updated"),
    foodLog: normalizeSavedFoodLog(json),
  };
}

export async function deleteAiMealScan(aiFoodLogId: string): Promise<any> {
  const normalizedId = String(aiFoodLogId || "").trim();
  if (!normalizedId) {
    throw new Error("Missing AI food log id.");
  }

  return requestFoodApi<any>(
    `/api/v1/custom-foods/scan/ai/${encodeURIComponent(normalizedId)}`,
    {
      method: "DELETE",
    },
    "Failed to delete AI scanned meal",
  );
}

function nutritionFactNumber(facts: any, key: string): number {
  return toNumber(facts?.[key]?.value ?? facts?.[key]);
}

function nutritionFactUnit(
  facts: any,
  key: string,
  fallback: string,
): string {
  return asText(facts?.[key]?.unit || fallback) || fallback;
}

function buildNutritionFactsFromValues(
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
): AiNutritionFacts {
  return {
    calories: { value: calories, unit: "kcal" },
    protein: { value: protein, unit: "g" },
    carbs: { value: carbs, unit: "g" },
    fats: { value: fats, unit: "g" },
  };
}

function normalizeAiMealScanResult(json: any): AiMealScanResult {
  const root = json?.data ?? json?.result ?? json ?? {};
  const facts = root?.nutritionFacts ?? {};
  const calories = toNumber(root?.calories ?? nutritionFactNumber(facts, "calories"));
  const protein = toNumber(root?.protein ?? nutritionFactNumber(facts, "protein"));
  const carbs = toNumber(root?.carbs ?? nutritionFactNumber(facts, "carbs"));
  const fats = toNumber(
    root?.fats ?? root?.fat ?? nutritionFactNumber(facts, "fats"),
  );

  return {
    source: asText(root?.source || "ai") || "ai",
    foodName: asText(root?.foodName ?? root?.name ?? "AI scanned meal"),
    servingSize: asText(
      root?.servingSize ?? root?.servingDescription ?? "1 visible serving",
    ),
    confidence: toNumber(root?.confidence),
    nutritionFacts: {
      calories: {
        value: calories,
        unit: nutritionFactUnit(facts, "calories", "kcal"),
      },
      protein: {
        value: protein,
        unit: nutritionFactUnit(facts, "protein", "g"),
      },
      carbs: {
        value: carbs,
        unit: nutritionFactUnit(facts, "carbs", "g"),
      },
      fats: {
        value: fats,
        unit: nutritionFactUnit(facts, "fats", "g"),
      },
    },
    calories,
    protein,
    carbs,
    fats,
    notes: asText(root?.notes ?? "Estimated from the submitted meal image."),
  };
}

function normalizeSavedFoodLog(json: any): FoodLogsHomeMealItem | null {
  const root = json?.data ?? json ?? {};
  const rawFoodLog = root?.foodLog ?? root?.createdFoodLog ?? root?.log ?? root;
  if (!rawFoodLog || typeof rawFoodLog !== "object") return null;
  return mapHomeMealItem(rawFoodLog);
}

function mapHomeMealItem(raw: any): FoodLogsHomeMealItem {
  const nestedFood =
    raw?.food && typeof raw.food === "object" ? raw.food : undefined;
  const nutritionFacts = raw?.nutritionFacts ?? nestedFood?.nutritionFacts ?? {};
  const source = asText(
    raw?.source ?? raw?.foodSource ?? nestedFood?.source ?? "",
  ).toLowerCase();
  const imageUrl = asText(raw?.imageUrl ?? raw?.image ?? nestedFood?.imageUrl);
  const confidenceValue = toOptionalNumber(raw?.confidence);
  const inferredAi = source === "ai" || Boolean(imageUrl) || confidenceValue != null;
  const rawServingSize =
    raw?.servingSize ??
    raw?.servingDescription ??
    nestedFood?.servingSize ??
    "1";

  return {
    id: raw?._id || raw?.id || raw?.foodLogId ? String(raw?._id ?? raw?.id ?? raw?.foodLogId) : undefined,
    foodId:
      raw?.foodId || nestedFood?._id || nestedFood?.id || typeof raw?.food === "string"
        ? String(raw?.foodId ?? nestedFood?._id ?? nestedFood?.id ?? raw?.food)
        : undefined,
    foodName: asText(
      raw?.foodName ?? nestedFood?.foodName ?? raw?.name ?? nestedFood?.name ?? "Unnamed",
    ),
    brandName: asText(raw?.brandName ?? nestedFood?.brandName ?? raw?.brand ?? nestedFood?.brand ?? ""),
    meal: asText(raw?.meal ?? ""),
    servings: toNumber(raw?.servings) || 1,
    servingSize: toNumber(rawServingSize) || 1,
    servingUnit: asText(raw?.servingUnit ?? raw?.servingDescription ?? "serving"),
    calories: toNumber(raw?.calories ?? nutritionFactNumber(nutritionFacts, "calories")),
    protein: toNumber(raw?.protein ?? nutritionFactNumber(nutritionFacts, "protein")),
    carbs: toNumber(raw?.carbs ?? nutritionFactNumber(nutritionFacts, "carbs")),
    fat: toNumber(
      raw?.fat ?? raw?.fats ?? nutritionFactNumber(nutritionFacts, "fats"),
    ),
    foodSource: raw?.foodSource ? String(raw.foodSource) : source || undefined,
    imageUrl: imageUrl || undefined,
    confidence: confidenceValue,
    notes: asText(raw?.notes ?? nestedFood?.notes) || undefined,
    source: source || undefined,
    servingDescription: asText(raw?.servingDescription ?? raw?.servingSize) || undefined,
    isAi: inferredAi,
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
    response = await fetchWithAuthRefresh(url.toString(), {
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
    response = await fetchWithAuthRefresh(url.toString(), {
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
