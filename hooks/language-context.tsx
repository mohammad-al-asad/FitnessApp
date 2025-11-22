// 🌐 language-context.ts — Manages app language, direction (LTR/RTL), and theme colors.
// Handles English/Arabic localization using AsyncStorage for persistence, Expo Updates for reload,
// and provides `useLanguage()` + `useSafeColors()` hooks for translations and consistent dark theme colors.

import { Language, TranslationKey, translations } from '@/constants/translations';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, I18nManager, Platform } from 'react-native';






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

const LANGUAGE_KEY = 'fitco_language';

const defaultLanguageContext = {
  currentLanguage: 'en' as Language,
  changeLanguage: async (_: Language) => {},
  colors: COLORS,
  t: (key: TranslationKey) => key,
  tArray: (key: TranslationKey) => [],
  isRTL: false as boolean,
  isLoading: false as boolean,
};



export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

 const loadLanguage = async () => {
  try {
    setIsLoading(true);
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (savedLanguage === "ar") {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
      setCurrentLanguage("ar");
      console.log("🌐 Arabic mode active, RTL forced");
    } else {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
      setCurrentLanguage("en");
      console.log("🌐 English mode active, LTR forced");
    }

    setIsLoading(false);
  } catch (error) {
    console.error("[Load Language] Error loading language:", error);
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    setCurrentLanguage("en");
    setIsLoading(false);
  }
};
;



  const changeLanguage = useCallback(async (language: Language) => {
    if (!language || (language !== 'en' && language !== 'ar')) {
      console.error('[Change Language] Invalid language provided');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const shouldBeRTL = language === 'ar';
      const rtlChanged = I18nManager.isRTL !== shouldBeRTL;
      
      console.log(`[Change Language] Requested: ${language}, shouldBeRTL: ${shouldBeRTL}, currentRTL: ${I18nManager.isRTL}, rtlChanged: ${rtlChanged}, Platform: ${Platform.OS}`);
      
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      
      if (Platform.OS !== 'web' && rtlChanged) {
        console.log('[Change Language] Native platform with RTL change - reloading app...');
        
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(shouldBeRTL);
        
        if (!__DEV__) {
          setTimeout(async () => {
            try {
              console.log('[Change Language] Reloading app...');
              await Updates.reloadAsync();
            } catch (reloadError) {
              console.error('[Change Language] Error reloading app:', reloadError);
              Alert.alert(
                language === 'ar' ? 'خطأ' : 'Error',
                language === 'ar'
                  ? 'يرجى إعادة تشغيل التطبيق يدويًا'
                  : 'Please restart the app manually'
              );
              setIsLoading(false);
            }
          }, 100);
        } else {
          console.log('[Change Language] Development mode - manual restart required');
          Alert.alert(
            language === 'ar' ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
            language === 'ar'
              ? 'يرجى إعادة تشغيل التطبيق يدويًا لتطبيق تغيير اللغة'
              : 'Please restart the app manually to apply the language change',
            [
              {
                text: language === 'ar' ? 'حسناً' : 'OK',
                onPress: () => setIsLoading(false)
              }
            ]
          );
        }
      } else {
        console.log('[Change Language] Web platform or no RTL change - applying language change');
        setCurrentLanguage(language);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[Change Language] Error changing language:', error);
      setIsLoading(false);
    }
  }, []);

  const t = useCallback((key: TranslationKey): string | string[] => {

    try {
      return (translations as any)[currentLanguage]?.[key] 
    ?? (translations as any).en?.[key] 
    ?? key;

    } catch (error) {
      console.error('Translation error for key:', key, error);
      return key;
    }
  }, [currentLanguage]);

const tArray = useCallback((key: TranslationKey): string[] => {
  try {
    const v = (translations as any)[currentLanguage]?.[key];
    if (Array.isArray(v)) return v;
    const fallback = (translations as any).en?.[key];
    if (Array.isArray(fallback)) return fallback;
    if (__DEV__) console.warn(`[i18n] tArray: key '${String(key)}' not an array`);
    return [];
  } catch (e) {
    if (__DEV__) console.warn(`[i18n] tArray error for key '${String(key)}'`, e);
    return [];
  }
}, [currentLanguage]);



  const isRTL = currentLanguage === 'ar';
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
  tArray,   // ✅ add this line
  isRTL,
  isLoading,
};

    
    // Debug log to ensure colors are properly set
    console.log('Language context colors:', {
      background: colors.background,
      text: colors.text,
      primary: colors.primary
    });
    
    return contextValue;
  }, [currentLanguage, changeLanguage, t, isRTL, isLoading]);
}, defaultLanguageContext);

// Safe hook that always returns valid colors
export const useSafeColors = () => {
  try {
    const context = useLanguage();
    const colors = context?.colors || COLORS;
    
    // Ensure all required color properties exist
    if (!colors.background || !colors.text || !colors.primary) {
      console.warn('Missing color properties, falling back to COLORS');
      return COLORS;
    }
    
    return colors;
  } catch (error) {
    console.error('Error accessing language context:', error);
    return COLORS;
  }
};

// Export colors directly for components that need them without context
export { COLORS };

