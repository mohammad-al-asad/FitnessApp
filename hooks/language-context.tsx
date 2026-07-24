// 🌐 language-context.ts — Manages app language, direction (LTR/RTL), and theme colors.
// Handles English/Arabic localization using AsyncStorage for persistence,
// and provides `useLanguage()` + `useSafeColors()` hooks for translations and consistent dark theme colors.

import {
  Language,
  TranslationKey,
  translations,
} from "@/constants/translations";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nManager } from "react-native";

// Dark theme colors - always use dark theme
const COLORS = {
  text: "#FFFFFF",
  background: "#1A1A1A",
  tint: "#4CAF50",
  tabIconDefault: "#666666",
  tabIconSelected: "#4CAF50",
  primary: "#4CAF50",
  secondary: "#388E3C",
  accent: "#66BB6A",
  warning: "#FF9800",
  info: "#2196F3",
  surface: "#2D2D2D",
  border: "#404040",
  placeholder: "#999999",
  success: "#4CAF50",
  error: "#F44336",
  card: "#2D2D2D",
};

export const LANGUAGE_KEY = "fitco_language";

const defaultLanguageContext = {
  currentLanguage: "ar" as Language,
  changeLanguage: async (_: Language) => {},
  colors: COLORS,
  t: (key: TranslationKey) => key,
  tArray: (key: TranslationKey) => [],
  isRTL: true as boolean,
  isLoading: false as boolean,
};

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("ar");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      setIsLoading(true);
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

      if (savedLanguage === "en") {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
        setCurrentLanguage("en");
      } else {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
        setCurrentLanguage("ar");
      }

      setIsLoading(false);
    } catch {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
      setCurrentLanguage("ar");
      setIsLoading(false);
    }
  };
  const changeLanguage = useCallback(async (language: Language) => {
    if (!language || (language !== "en" && language !== "ar")) {
      console.error("[Change Language] Invalid language provided");
      return;
    }

    try {
      const shouldBeRTL = language === "ar";

      console.log(
        `[Change Language] Requested: ${language}, shouldBeRTL: ${shouldBeRTL}, currentRTL: ${I18nManager.isRTL}`,
      );

      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      console.log(
        "Language changed to",
        await AsyncStorage.getItem(LANGUAGE_KEY),
      );

      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      setCurrentLanguage(language);
    } catch (error) {
      console.error("[Change Language] Error changing language:", error);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string | string[] => {
      try {
        return (
          (translations as any)[currentLanguage]?.[key] ??
          (translations as any).en?.[key] ??
          key
        );
      } catch (error) {
        console.error("Translation error for key:", key, error);
        return key;
      }
    },
    [currentLanguage],
  );

  const tArray = useCallback(
    (key: TranslationKey): string[] => {
      try {
        const v = (translations as any)[currentLanguage]?.[key];
        if (Array.isArray(v)) return v;
        const fallback = (translations as any).en?.[key];
        if (Array.isArray(fallback)) return fallback;
        if (__DEV__)
          console.warn(`[i18n] tArray: key '${String(key)}' not an array`);
        return [];
      } catch (e) {
        if (__DEV__)
          console.warn(`[i18n] tArray error for key '${String(key)}'`, e);
        return [];
      }
    },
    [currentLanguage],
  );

  const isRTL = currentLanguage === "ar";
  // prevent UI render until language loads

  return useMemo(() => {
    // Always ensure colors is defined and has all required properties
    const colors = {
      ...COLORS,
      // Ensure all properties are defined
      text: COLORS.text || "#FFFFFF",
      background: COLORS.background || "#1A1A1A",
      primary: COLORS.primary || "#4CAF50",
      surface: COLORS.surface || "#2D2D2D",
      border: COLORS.border || "#404040",
      placeholder: COLORS.placeholder || "#999999",
    };

    const contextValue = {
      currentLanguage,
      changeLanguage,
      colors,
      t,
      tArray, // ✅ add this line
      isRTL,
      isLoading,
    };

    return contextValue;
  }, [currentLanguage, changeLanguage, t, tArray, isRTL, isLoading]);
}, defaultLanguageContext);

// Safe hook that always returns valid colors
export const useSafeColors = () => {
  try {
    const context = useLanguage();
    const colors = context?.colors || COLORS;

    // Ensure all required color properties exist
    if (!colors.background || !colors.text || !colors.primary) {
      console.warn("Missing color properties, falling back to COLORS");
      return COLORS;
    }

    return colors;
  } catch (error) {
    console.error("Error accessing language context:", error);
    return COLORS;
  }
};

// Export colors directly for components that need them without context
export { COLORS };
