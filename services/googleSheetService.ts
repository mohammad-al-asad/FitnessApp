// 🧾 googleSheetService.ts — Fitco Google Sheets integration (fixed for your exact header layout)

import AsyncStorage from "@react-native-async-storage/async-storage";


const SHEET_CACHE_KEY = "food_sheet_cache_v1";
const SHEET_CACHE_TIME = 24 * 60 * 60 * 1000; // 1 day in ms

export type SheetFood = {
  BRAND: string;
  PRODUCT: string;
  "SERVING SIZE": string;
  CALORIES: number;
  PROTEIN: number;
  CARBS: number;
  FAT: number;
  "BARCODE ID"?: string;
};

const API_KEY = "AIzaSyCnqB5IdbeO2fupJ18SDfHU1U4fCWc7QZI";
const SHEET_ID = "1Mm2fK-PUnFKJxq7US0AmXIAH8j4OZLYta3KHoWym0f0";
const SHEET_NAME = "Sheet1"; // ✅ match your sheet tab name
const RANGE = `${SHEET_NAME}!A:H`; // ✅ includes up to BARCODE ID

export async function getFoodsFromSheet(): Promise<SheetFood[]> {
  
// ⚡ Try cached data first
const cachedData = await AsyncStorage.getItem("cachedFoodDatabase");
if (cachedData) {
  console.log("📦 Loaded food data from cache");
  return JSON.parse(cachedData);
}

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
    RANGE
  )}?key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status} ${res.statusText}`);

  const json = await res.json();
  const rows: string[][] = json.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => (h || "").trim());
  const foods: SheetFood[] = rows.slice(1).map((row) => {
    const item: any = {};
    headers.forEach((header, i) => {
      item[header] = row[i] ?? "";
    });

    return {
      BRAND: item["BRAND"] || "",
      PRODUCT: item["PRODUCT"] || "Unnamed",
      "SERVING SIZE": item["SERVING SIZE"] || "100g",
      CALORIES: parseFloat(item["CALORIES"]) || 0,
      PROTEIN: parseFloat(item["PROTEIN"]) || 0,
      CARBS: parseFloat(item["CARBS"]) || 0,
      FAT: parseFloat(item["FAT"]) || 0,
      "BARCODE ID": item["BARCODE ID"] || "",
    };
  });

  console.log(`✅ Loaded ${foods.length} foods from sheet`);
  return foods;
}

export async function getFoodsFromSheetCached(): Promise<SheetFood[]> {
  try {
    const cached = await AsyncStorage.getItem(SHEET_CACHE_KEY);
    const cachedTime = await AsyncStorage.getItem(`${SHEET_CACHE_KEY}_time`);

    // if (cached && cachedTime && Date.now() - Number(cachedTime) < SHEET_CACHE_TIME) {
    //   console.log("✅ Using cached food data");
    //   return JSON.parse(cached);
    // }

    console.log("🌐 Fetching fresh data from Google Sheets...");
    const fresh = await getFoodsFromSheet();
    await AsyncStorage.setItem(SHEET_CACHE_KEY, JSON.stringify(fresh));
    await AsyncStorage.setItem(`${SHEET_CACHE_KEY}_time`, Date.now().toString());
    console.log("💾 Cached new sheet data");
    return fresh;
  } catch (error) {
    console.error("❌ Cached sheet fetch failed:", error);
    return await getFoodsFromSheet();
  }
}

export async function getFoodByBarcode(barcode: string): Promise<SheetFood | null> {
  try {
    const foods = await getFoodsFromSheetCached();

    const normalizeBarcodeForSearch = (value?: string) => {
      if (!value) return "";
      return value
        .replace(/^'/, "")   // remove Sheets text marker
        .replace(/^0+/, "")  // remove leading zeros
        .trim();
    };

    const searchBarcode = normalizeBarcodeForSearch(barcode);

    const found = foods.find(food =>
      normalizeBarcodeForSearch(food["BARCODE ID"]) === searchBarcode
    );


    return found || null;
  } catch (error) {
    console.error("❌ Error searching for food by barcode:", error);
    return null;
  }
}

export async function addFoodToSheet(food: any): Promise<void> {
  try {
    const endpoint =
      "https://script.google.com/macros/s/AKfycbyNyQriFzpdI4o_4W8mlXWMyXQHiJ5ZEwjchvUy0q-ewT66hKYTzT1u4HsdU_N8JRSA9g/exec";
      

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        BRAND: food.brand,
        PRODUCT: food.product,
        "SERVING SIZE": food.serving,
        CALORIES: food.calories,
        PROTEIN: food.protein,
        CARBS: food.carbs,
        FAT: food.fat,
        "BARCODE ID": food.barcode || "",
      }),
    });

    if (!response.ok) throw new Error("Failed to add food to sheet");
    console.log("✅ Food added successfully!");
  } catch (err) {
    console.error("❌ Error adding food to sheet:", err);
    throw err;
  }
}
