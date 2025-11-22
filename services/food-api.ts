// 🍎 food-api.ts — Handles all food search logic for Fitco.
// 1. Fetches and caches food data from the linked Google Sheet (10-minute cache).
// 2. Filters local results matching the query.
// 3. Falls back to USDA’s FoodData Central API if nothing found.
// Also exports a simple debounce helper for delaying search input requests.

// services/food-api.ts
import { getFoodsFromSheet } from "./googleSheetService";
// ✅ Simple in-memory cache for sheet foods
let cachedSheetFoods: any[] | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes
// 🕒 Debounce helper to delay API calls while typing
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export function debounceSearch<T extends (...args: any[]) => void>(func: T, delay = 400) {
  return (...args: Parameters<T>) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => func(...args), delay);
  };
}

export async function searchFood(query: string): Promise<any[]> {
  if (!query.trim()) return [];

  try {
    // 🥇 Step 1: Try fetching from your Google Sheet
    // 🧠 Use cached data if available and not expired
if (!cachedSheetFoods || !lastFetchTime || Date.now() - lastFetchTime > CACHE_DURATION) {
  console.log("⏳ Fetching foods from Google Sheet...");
  cachedSheetFoods = await getFoodsFromSheet();
  lastFetchTime = Date.now();
} else {
  console.log("⚡ Using cached Google Sheet data");
}

const sheetFoods = cachedSheetFoods;


    if (Array.isArray(sheetFoods) && sheetFoods.length > 0) {
      const matchedSheet = sheetFoods.filter((food) =>
        (food.PRODUCT || food.name || "")
          .toLowerCase()
          .includes(query.toLowerCase())
      );

      if (matchedSheet.length > 0) {
        console.log(`✅ Found ${matchedSheet.length} results in Google Sheet`);
        return matchedSheet.map((food) => ({
          name: food.PRODUCT || food.name || "Unnamed",
          brand: food.BRAND || "Unknown",
          serving: food.SERVING_SIZE || "100g",
          calories: Number(food.CALORIES || 0),
          protein: Number(food.PROTEIN || 0),
          carbs: Number(food.CARBS || 0),
          fats: Number(food.FAT || 0),
          barcode: food.BARCODE_ID || "",
          source: "GoogleSheet",
        }));
      }
    }

    // 🥈 Step 2: Fallback to USDA FoodData Central
    const USDA_API_KEY = "qAUJh8I3MdnindPR4JyErcLkE8p0xPkcZUFM1N04";
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      query
    )}&pageSize=10&api_key=${USDA_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    const usdaResults =
      data.foods?.map((item: any) => {
        const nutrients = item.foodNutrients || [];
        const getValue = (name: string) =>
          nutrients.find((n: any) =>
            n.nutrientName.toLowerCase().includes(name)
          )?.value || 0;

        return {
          name: item.description || "Unnamed",
          brand: item.brandOwner || "Generic",
          serving: "100g",
          calories: Math.round(getValue("energy")),
          protein: Math.round(getValue("protein")),
          carbs: Math.round(getValue("carbohydrate")),
          fats: Math.round(getValue("fat")),
          source: "USDA",
        };
      }) || [];

    console.log(`🇺🇸 Fetched ${usdaResults.length} results from USDA`);
    return usdaResults;
  } catch (err) {
    console.error("❌ Error during search:", err);
    return [];
  }
}

