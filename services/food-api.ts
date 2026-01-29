// services/food-api.ts
import { getFoodsFromSheet } from "./googleSheetService";

let cachedSheetFoods: any[] | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 1000 * 60 * 10; 

// ✅ Corrected Debounce (Now returns a properly scoped function)
export function debounceSearch<T extends (...args: any[]) => void>(func: T, delay = 400) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export async function searchFood(query: string): Promise<any[]> {
  if (!query.trim()) return [];

  let matchedSheet: any[] = [];

  // 🥇 Step 1: Google Sheet + Cache Logic
  try {
    if (!cachedSheetFoods || !lastFetchTime || Date.now() - lastFetchTime > CACHE_DURATION) {
      cachedSheetFoods = await getFoodsFromSheet();
      lastFetchTime = Date.now();
    }

    if (Array.isArray(cachedSheetFoods)) {
      matchedSheet = cachedSheetFoods.filter((food) => {
        const name = (food.PRODUCT || food.name || "").toLowerCase();
        const brand = (food.BRAND || "").toLowerCase();
        const searchTerm = query.toLowerCase();
        return name.includes(searchTerm) || brand.includes(searchTerm);
      });
    }
  } catch (err) {
    console.error("⚠️ Google Sheet fetch failed, falling back to USDA:", err);
    // We don't return here so we can try the USDA fallback
  }

  // If we found local results, return them immediately
  if (matchedSheet.length > 0) {
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

  // 🥈 Step 2: Fallback to USDA FoodData Central
  try {
    const USDA_API_KEY = "YOUR_API_KEY"; // Best practice: Use process.env
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${USDA_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.foods?.map((item: any) => {
      const nutrients = item.foodNutrients || [];
      // USDA uses specific names/IDs. "Energy" is calories.
      const getValue = (attr: string) =>
        nutrients.find((n: any) => n.nutrientName.toLowerCase().includes(attr.toLowerCase()))?.value || 0;

      return {
        name: item.description || "Unnamed",
        brand: item.brandOwner || "Generic",
        serving: "100g",
        calories: Math.round(getValue("Energy")), 
        protein: Math.round(getValue("Protein")),
        carbs: Math.round(getValue("Carbohydrate")),
        fats: Math.round(getValue("Total lipid (fat)")),
        source: "USDA",
      };
    }) || [];
  } catch (err) {
    console.error("❌ USDA API Error:", err);
    return [];
  }
}