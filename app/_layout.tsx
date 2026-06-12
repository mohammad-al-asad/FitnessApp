import FirstSignInSubscriptionModal from "@/components/FirstSignInSubscriptionModal";
import SplashScreen from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/hooks/auth-context";
import { LanguageProvider, useLanguage } from "@/hooks/language-context";
import { NutritionProvider } from "@/hooks/nutrition-store";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  UserProfileProvider,
  useUserProfile,
} from "@/hooks/user-profile-context";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Asset } from "expo-asset";
import { router, Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  BackHandler,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import "react-native-reanimated";
import Purchases from "react-native-purchases";

// 🚀 Keep the native splash screen visible until our custom animation is ready to take over.
// Calling this at the top level is best practice to prevent early auto-hiding.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Inner navigator that handles auth routing
function RootNavigator() {
  const {
    user,
    isInitialized,
    firstSignInSubscriptionPromptVisible,
    completeFirstSignInSubscriptionPrompt,
  } = useAuth();

  const { profile, isLoading: isProfileLoading } = useUserProfile();

  const shouldShowSubscriptionPrompt = Boolean(
    user && firstSignInSubscriptionPromptVisible,
  );

  useEffect(() => {
    if (user && isInitialized) {
      router.replace("/(tabs)/home");
    }
  }, [isInitialized]);

  if (!isInitialized || (user && isProfileLoading)) {
    return null;
  }

  const handleDismissSubscriptionPrompt = async () => {
    await completeFirstSignInSubscriptionPrompt();
  };

  const handleSubscribeFromPrompt = async () => {
    await completeFirstSignInSubscriptionPrompt();
    router.push("/settings/subscription" as any);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        {!user ? (
          <Stack.Screen name="(auth)" options={{ headerShown: false, gestureEnabled: false }} />
        ) : !profile ? (
          <Stack.Screen name="(onboarding)" options={{ headerShown: false, gestureEnabled: false }} />
        ) : (
          <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        )}
        {user && <Stack.Screen name="logFood" options={{ gestureEnabled: false }} />}
      </Stack>
      <FirstSignInSubscriptionModal
        visible={shouldShowSubscriptionPrompt}
        onDismiss={() => {
          void handleDismissSubscriptionPrompt();
        }}
        onSubscribe={() => {
          void handleSubscribeFromPrompt();
        }}
      />
    </>
  );
}

// Inner app shell that is allowed to use useLanguage()
function AppShell() {
  const { isRTL, isLoading: isLangLoading } = useLanguage();
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload icons
        const images = [
          require("@/assets/icons/instagram.png"),
          require("@/assets/icons/tiktok.png"),
          require("@/assets/icons/snapchat.png"),
        ];

        const cacheImages = images.map((img) => Asset.loadAsync(img));
        await Promise.all(cacheImages);
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();

    // Maintain app state ref for internal tracking
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // 🚀 Native splash hiding is now handled inside SplashScreen component for a smoother transition

  if (isLangLoading) {
    return null;
  }

  return (
    <View style={{ flex: 1, direction: isRTL ? "rtl" : "ltr" }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <UserProfileProvider>
            <NutritionProvider>
              <RootNavigator />
              {showSplash && (
                <View style={StyleSheet.absoluteFill}>
                  <SplashScreen
                    onFinish={() => {
                      setShowSplash(false);
                    }}
                  />
                </View>
              )}
              <StatusBar style="light" />
            </NutritionProvider>
          </UserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </View>
  );
}

import { SafeAreaProvider } from "react-native-safe-area-context";

// RootLayout now ONLY wraps AppShell with LanguageProvider
function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "ios") {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || "",
      });
    } else if (Platform.OS === "android") {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || "",
      });
    }

    // Safely redirect RevenueCat logs to console.log.
    // This avoids console.error/console.warn which trigger Metro developer tool crashes in RN 0.81+.
    Purchases.setLogHandler((logLevel, message) => {
      console.log(`[RevenueCat] [${logLevel}] ${message}`);
    });
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Return true to prevent default back behavior
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppShell />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;
